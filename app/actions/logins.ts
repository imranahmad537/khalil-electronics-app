"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPermissions } from "@/lib/current-user";
import { friendlyDbError } from "@/lib/db-errors";
import { normalizeUsername, passwordError, usernameError, usernameToEmail } from "@/lib/staff-login";
import type { UserRole } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

const ROLES: UserRole[] = ["owner", "manager", "accountant", "sales", "avo"];
const NOT_ALLOWED = { ok: false as const, error: "Only the owner can manage logins." };
const NO_ADMIN = {
  ok: false as const,
  error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server, so logins can't be managed.",
};

// Every action that uses the service-role key first asks the database whether
// this caller may manage this account (can_manage_login in 0007), so the
// owner can never touch owner accounts or the hidden developer account.
async function mayManage(target: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_login", { p_target: target });
  return data === true;
}

export interface CreateLoginInput {
  /** link to an existing employee record, or null to create one */
  employeeId: string | null;
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
  zone: string;
}

export async function createLoginAction(input: CreateLoginInput): Promise<Result & { username?: string }> {
  const perms = await getCurrentPermissions();
  if (!perms.canManageLogins) return NOT_ALLOWED;
  if (!ROLES.includes(input.role)) return { ok: false, error: "Choose a role." };
  if (input.role === "owner" && !perms.isSuper) {
    return { ok: false, error: "Owner logins can only be created by the developer account." };
  }

  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  if (!fullName) return { ok: false, error: "Name is required." };
  const uErr = usernameError(username);
  if (uErr) return { ok: false, error: `Username: ${uErr}` };
  const pErr = passwordError(input.password);
  if (pErr) return { ok: false, error: `Password: ${pErr}` };

  const admin = createAdminClient();
  if (!admin) return NO_ADMIN;

  const { data: taken } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
  if (taken) return { ok: false, error: `The username "${username}" is already taken.` };

  if (input.employeeId) {
    const { data: emp } = await admin.from("employees").select("profile_id").eq("id", input.employeeId).maybeSingle();
    if (!emp) return { ok: false, error: "Employee not found." };
    if (emp.profile_id) return { ok: false, error: "This employee already has a login." };
  }

  const created = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
  });
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? "";
    return { ok: false, error: /already/i.test(msg) ? `The username "${username}" is already taken.` : "Could not create the login." };
  }
  const id = created.data.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id,
    full_name: fullName,
    role: input.role,
    username,
    zone: input.role === "avo" ? input.zone.trim() || null : null,
    active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(id); // don't leave a login without a staff profile
    return { ok: false, error: friendlyDbError(profileError, "Could not create the login.") };
  }

  if (input.employeeId) {
    await admin.from("employees").update({ profile_id: id, role: input.role }).eq("id", input.employeeId);
  } else if (input.role !== "owner") {
    await admin.from("employees").insert({ profile_id: id, full_name: fullName, role: input.role, salary: 0 });
  }

  revalidatePath("/logins");
  revalidatePath("/employees");
  revalidatePath("/recovery");
  return { ok: true, username };
}

export async function resetPasswordAction(profileId: string, password: string): Promise<Result> {
  if (!(await getCurrentPermissions()).canManageLogins) return NOT_ALLOWED;
  const pErr = passwordError(password);
  if (pErr) return { ok: false, error: `Password: ${pErr}` };
  if (!(await mayManage(profileId))) return { ok: false, error: "You can't change this account's password." };

  const admin = createAdminClient();
  if (!admin) return NO_ADMIN;
  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) return { ok: false, error: "Could not reset the password." };
  return { ok: true };
}

export async function setLoginActiveAction(profileId: string, active: boolean): Promise<Result> {
  if (!(await getCurrentPermissions()).canManageLogins) return NOT_ALLOWED;
  if (!(await mayManage(profileId))) return { ok: false, error: "You can't change this account." };

  const admin = createAdminClient();
  if (!admin) return NO_ADMIN;

  // profiles.active is what RLS checks; the ban ends any open session.
  const { error } = await admin.from("profiles").update({ active }).eq("id", profileId);
  if (error) return { ok: false, error: friendlyDbError(error) };
  await admin.from("employees").update({ active }).eq("profile_id", profileId);
  await admin.auth.admin.updateUserById(profileId, { ban_duration: active ? "none" : "876000h" });

  revalidatePath("/logins");
  revalidatePath("/employees");
  return { ok: true };
}

/** Any signed-in user can change their own password. */
export async function changeOwnPasswordAction(password: string): Promise<Result> {
  const pErr = passwordError(password);
  if (pErr) return { ok: false, error: `Password: ${pErr}` };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: /same|different/i.test(error.message) ? "Choose a different password from the current one." : "Could not change the password." };
  return { ok: true };
}
