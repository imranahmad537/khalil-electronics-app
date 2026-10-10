import { createClient } from "@supabase/supabase-js";

// Service-role client for the few things RLS deliberately can't do
// (auth admin: banning a deactivated employee's login). Server-only — never
// import from a client component. Returns null when the key isn't set.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
