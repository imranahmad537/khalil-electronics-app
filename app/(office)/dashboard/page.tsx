import { Calendar, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { KpiCard } from "@/components/kpi-card";
import { DuesTable } from "@/components/dues-table";
import { OfficerRecovery } from "@/components/officer-recovery";
import { ReceiptsToday } from "@/components/receipts-today";
import { SendRemindersButton } from "@/components/send-reminders-button";
import { getDashboardData } from "@/lib/data/dashboard";
import { money } from "@/lib/money";
import { WINDOW_END, ATTENTION_STATUSES } from "@/lib/constants";

type Risk = "all" | "attention" | "due" | "paid";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ risk?: string }>;
}) {
  const { risk: riskParam } = await searchParams;
  const risk: Risk = (["all", "attention", "due", "paid"] as const).includes(riskParam as Risk)
    ? (riskParam as Risk)
    : "all";

  const data = await getDashboardData();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const visibleRows =
    risk === "all"
      ? data.rows
      : risk === "attention"
        ? data.rows.filter((r) => ATTENTION_STATUSES.includes(r.status as (typeof ATTENTION_STATUSES)[number]))
        : data.rows.filter((r) => r.status === risk);

  const remindable = data.rows
    .filter((r) => (r.due_now ?? 0) > 0)
    .map((r) => ({ customerId: r.customer_id, name: r.full_name, amount: Math.max(0, r.due_now ?? 0) }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        hint={`${monthLabel} · ${data.openAccountsCount} open · ${data.behindCount} behind`}
      >
        <MonthSwitcher />
        <SendRemindersButton customers={remindable} monthLabel={monthLabel} />
      </PageHeader>

      <div className="kpis">
        <KpiCard
          label="Due this month"
          value={money(data.totalDue)}
          note={`${data.openAccountsCount} accounts`}
          tone="hero"
          icon={Calendar}
          href="/dashboard?risk=due"
        />
        <KpiCard
          label="Collected today"
          value={money(data.collectedToday)}
          note={`${data.receiptsToday.length} receipts`}
          tone="good"
          icon={CheckCircle}
          href="/receipts"
        />
        <KpiCard
          label="Outstanding"
          value={money(data.outstanding)}
          note={`By the ${WINDOW_END}th`}
          tone="warn"
          icon={AlertCircle}
          href="/dashboard?risk=attention"
        />
        <KpiCard
          label="Behind"
          value={String(data.behindCount)}
          note={`${data.defaulterCount} defaulter${data.defaulterCount === 1 ? "" : "s"}`}
          tone="plain"
          icon={ShieldCheck}
          href="/recovery"
        />
      </div>

      <div className="dash">
        <DuesTable allRows={data.rows} visibleRows={visibleRows} risk={risk} monthLabel={monthLabel} />
        <div className="flex flex-col gap-4">
          <OfficerRecovery officers={data.officers} />
          <ReceiptsToday receipts={data.receiptsToday} total={data.collectedToday} />
        </div>
      </div>
    </div>
  );
}
