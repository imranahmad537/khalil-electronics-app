"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPermissions } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyDbError } from "@/lib/db-errors";
import type { UserRole } from "@/lib/types";
import { cellError, cnicError } from "@/lib/validation";

export interface EmployeeInput {
  fullName: string;
  role: UserRole;
  cell: string;
  cnic: string;
  salary: number;
  joinedOn: string;
}

const FORBIDDEN = { ok: false as const, error: "Your role doesn't have access to employees." };

// Cell and CNIC are optional for staff, but must be in the standard format when given.
function validate(input: EmployeeInput): string | null {
  if (!input.fullName.trim()) return "Name is required.";
  const cell = cellError(input.cell);
  if (cell) return `Cell: ${cell}`;
  const cnic = cnicError(input.cnic);
  if (cnic) return `CNIC: ${cnic}`;
  return null;
}

export async function createEmployeeAction(input: EmployeeInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    full_name: input.fullName.trim(),
    role: input.role,
    cell: input.cell.trim() || null,
    cnic: input.cnic.trim() || null,
    salary: input.salary,
    joined_on: input.joinedOn || null,
  });

  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/employees");
  return { ok: true };
}

export async function updateEmployeeAction(
  id: string,
  input: EmployeeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.fullName.trim(),
      role: input.role,
      cell: input.cell.trim() || null,
      cnic: input.cnic.trim() || null,
      salary: input.salary,
      joined_on: input.joinedOn || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/employees");
  return { ok: true };
}

// Deactivating an employee also switches off their login: set_employee_active
// flips profiles.active (which my_role()/RLS check), and the auth user is
// banned so their session can't be refreshed.
export async function deactivateEmployeeAction(id: string): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;

  const supabase = await createClient();
  const { data: profileId, error } = await supabase.rpc("set_employee_active", { p_employee: id, p_active: false });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not deactivate this employee.") };

  let warning: string | undefined;
  if (profileId) {
    const admin = createAdminClient();
    const banned = admin ? await admin.auth.admin.updateUserById(profileId as string, { ban_duration: "876000h" }) : null;
    if (!banned || banned.error) {
      warning = "Access is revoked, but their current session couldn't be signed out — it expires within the hour.";
    }
  }

  revalidatePath("/employees");
  return { ok: true, warning };
}
