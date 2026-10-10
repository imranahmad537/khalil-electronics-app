// Supabase connection settings. New projects issue a publishable key
// (sb_publishable_…); older/local setups use the legacy anon JWT. Either works
// as the public client key.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLIC_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
