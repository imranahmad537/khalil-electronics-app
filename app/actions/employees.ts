"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPermissions } from "@/lib/current-user";
import type { UserRole } from "@/lib/types";

export interface EmployeeInput {
  fullName: string;
  role: UserRole;
  cell: string;
  cnic: string;
  salary: number;
  joinedOn: string;
}

const FORBIDDEN = { ok: false as const, error: "Your role doesn't have access to employees." };

export async function createEmployeeAction(input: EmployeeInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  if (!input.fullName.trim()) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    full_name: input.fullName.trim(),
    role: input.role,
    cell: input.cell.trim() || null,
    cnic: input.cnic.trim() || null,
    salary: input.salary,
    joined_on: input.joinedOn || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/employees");
  return { ok: true };
}

export async function updateEmployeeAction(
  id: string,
  input: EmployeeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  if (!input.fullName.trim()) return { ok: false, error: "Name is required." };

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

  if (error) return { ok: false, error: error.message };
  revalidatePath("/employees");
  return { ok: true };
}

export async function deactivateEmployeeAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;

  const supabase = await createClient();
  const { error } = await supabase.from("employees").update({ active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/employees");
  return { ok: true };
}
