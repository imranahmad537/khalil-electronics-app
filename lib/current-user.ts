import { createClient } from "@/lib/supabase/server";
import { getPermissions, type Permissions } from "@/lib/permissions";

export async function getCurrentPermissions(): Promise<Permissions> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return getPermissions(null);

  const { data: profile } = await supabase.from("profiles").select("role, is_super").eq("id", user.id).single();
  return getPermissions(profile?.role ?? null, profile?.is_super ?? false);
}
