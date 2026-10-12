import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAFF_EMAIL_DOMAIN } from "@/lib/staff-login";
import type { UserRole } from "@/lib/types";

export interface LoginRow {
  id: string;
  fullName: string;
  role: UserRole;
  /** what this person types on the login screen */
  loginId: string;
  active: boolean;
  isSuper: boolean;
  isMe: boolean;
  lastSignIn: string | null;
  /** mirrors can_manage_login() in 0007_staff_logins.sql */
  canManage: boolean;
}

export interface EmployeeWithoutLogin {
  id: string;
  fullName: string;
  role: UserRole;
}

export async function getLoginsData(viewerIsSuper: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS hides the developer account from everyone but itself.
  const [profilesRes, employeesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, username, active, is_super").order("full_name"),
    supabase.from("employees").select("id, full_name, role").is("profile_id", null).eq("active", true).order("full_name"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);

  // emails + last sign-in live in Supabase Auth (service role only)
  const authById = new Map<string, { email: string | null; lastSignIn: string | null }>();
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) authById.set(u.id, { email: u.email ?? null, lastSignIn: u.last_sign_in_at ?? null });
  }

  const rows: LoginRow[] = (profilesRes.data ?? []).map((p) => {
    const auth = authById.get(p.id);
    const email = auth?.email ?? null;
    const loginId = p.username ?? (email?.endsWith("@" + STAFF_EMAIL_DOMAIN) ? email.split("@")[0] : (email ?? "—"));
    const isMe = p.id === user?.id;
    return {
      id: p.id,
      fullName: p.full_name,
      role: p.role,
      loginId,
      active: p.active,
      isSuper: p.is_super,
      isMe,
      lastSignIn: auth?.lastSignIn ?? null,
      canManage: !isMe && (viewerIsSuper || (!p.is_super && p.role !== "owner")),
    };
  });

  const employeesWithoutLogin: EmployeeWithoutLogin[] = (employeesRes.data ?? []).map((e) => ({
    id: e.id,
    fullName: e.full_name,
    role: e.role,
  }));

  return { rows, employeesWithoutLogin, adminReady: !!admin };
}
