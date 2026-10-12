// Creates (or resets) the developer's hidden super-user account.
// It can't be created from inside the app — only with the service-role key.
//
//   node scripts/create-superuser.mjs <username> <password> "<Full Name>"
//
// The account signs in with the username like any staff login, has full owner
// powers, can manage owner accounts, and is invisible to everyone else
// (supabase/migrations/0007_staff_logins.sql). Running it again for the same
// username resets the password and re-activates the account.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const STAFF_EMAIL_DOMAIN = "staff.khalil.local"; // keep in sync with lib/staff-login.ts

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
  } catch {
    // fine if .env.local doesn't exist — assume env vars are already set
  }
}
loadEnvLocal();

const [usernameArg, password, fullName = "Developer"] = process.argv.slice(2);
const username = (usernameArg ?? "").trim().toLowerCase();
if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username) || !password || password.length < 8) {
  console.error('Usage: node scripts/create-superuser.mjs <username> <password (8+ chars)> "<Full Name>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const email = `${username}@${STAFF_EMAIL_DOMAIN}`;

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("Could not reach Supabase Auth:", listError.message);
  process.exit(1);
}
let user = list.users.find((u) => u.email === email);

if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, ban_duration: "none" });
  if (error) {
    console.error("Could not reset the password:", error.message);
    process.exit(1);
  }
  console.log(`Existing login "${username}": password reset.`);
} else {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, username } });
  if (error) {
    console.error("Could not create the login:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`Created login "${username}".`);
}

const { error: profileError } = await admin
  .from("profiles")
  .upsert({ id: user.id, full_name: fullName, role: "owner", username, is_super: true, active: true });
if (profileError) {
  console.error("Could not set up the super-user profile:", profileError.message);
  console.error("Has migration 0007_staff_logins.sql been pushed? (npx supabase db push)");
  process.exit(1);
}
console.log(`"${username}" is now the hidden super user. Sign in with that username.`);
