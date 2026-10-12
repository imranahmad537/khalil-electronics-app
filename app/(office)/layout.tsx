import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { SHOP_NAME, WINDOW_END } from "@/lib/constants";
import { ROLE_LABEL } from "@/lib/roles";
import { getPermissions } from "@/lib/permissions";
import { shopTodayStartISO } from "@/lib/shop-time";
import { getMyAttendanceToday } from "@/lib/data/attendance";
import type { UserRole } from "@/lib/types";


export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_super")
    .eq("id", user.id)
    .single();

  const [{ count: customersCount }, { count: receiptsToday }, { count: behindCount }, attendance] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("receipts").select("id", { count: "exact", head: true }).gte("collected_at", shopTodayStartISO()),
    supabase
      .from("customer_month_status")
      .select("customer_id", { count: "exact", head: true })
      .in("status", ["overdue", "default"]),
    getMyAttendanceToday(),
  ]);

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const permissions = getPermissions((profile?.role as UserRole | undefined) ?? null, profile?.is_super ?? false);

  return (
    <AppShell
      shopName={SHOP_NAME}
      userName={profile?.full_name ?? user.email ?? "User"}
      userRole={permissions.isSuper ? "Developer" : roleLabel(profile?.role)}
      windowNote={`Collection window · 1–${WINDOW_END} ${monthLabel}`}
      badges={{
        customers: customersCount ?? 0,
        receipts: receiptsToday ?? 0,
        recovery: behindCount ?? 0,
        recoveryAttention: (behindCount ?? 0) > 0,
      }}
      permissions={permissions}
      attendance={attendance}
    >
      {children}
    </AppShell>
  );
}

function roleLabel(role?: string) {
  return role && role in ROLE_LABEL ? ROLE_LABEL[role as UserRole] : "Team member";
}
