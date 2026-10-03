import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { SHOP_NAME, WINDOW_END } from "@/lib/constants";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const [{ count: customersCount }, { count: receiptsToday }, { count: behindCount }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("receipts").select("id", { count: "exact", head: true }).gte("collected_at", startOfTodayISO()),
    supabase
      .from("customer_month_status")
      .select("customer_id", { count: "exact", head: true })
      .in("status", ["overdue", "default"]),
  ]);

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <AppShell
      shopName={SHOP_NAME}
      userName={profile?.full_name ?? user.email ?? "User"}
      userRole={roleLabel(profile?.role)}
      windowNote={`Collection window · 1–${WINDOW_END} ${monthLabel}`}
      badges={{
        customers: customersCount ?? 0,
        receipts: receiptsToday ?? 0,
        recovery: behindCount ?? 0,
        recoveryAttention: (behindCount ?? 0) > 0,
      }}
    >
      {children}
    </AppShell>
  );
}

function roleLabel(role?: string) {
  switch (role) {
    case "owner":
      return "Owner / Admin";
    case "manager":
      return "Shop manager";
    case "accountant":
      return "Accountant";
    case "sales":
      return "Sales officer";
    case "avo":
      return "AVO";
    default:
      return "Team member";
  }
}
