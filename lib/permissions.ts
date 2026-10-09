import type { UserRole } from "@/lib/types";

// Mirrors the actual RLS policies in supabase/migrations/0003_rls.sql — this
// is UI-level convenience (hide/disable what a role can't use, show a clear
// "not available" page instead of silently-empty data) layered on top of
// that real enforcement, not a replacement for it.

const EMPLOYEES_ROLES: UserRole[] = ["owner", "manager"]; // hr policy
const FINANCE_ROLES: UserRole[] = ["owner", "manager", "accountant"]; // finance policy (expenses, vendor_payments, purchases)

export interface Permissions {
  role: UserRole | null;
  canManageEmployees: boolean;
  canManageFinance: boolean;
}

export function getPermissions(role: UserRole | null | undefined): Permissions {
  const r = role ?? null;
  return {
    role: r,
    canManageEmployees: !!r && EMPLOYEES_ROLES.includes(r),
    canManageFinance: !!r && FINANCE_ROLES.includes(r),
  };
}
