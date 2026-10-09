import { CheckCircle, UserCheck, Users, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AssignDialog } from "@/components/assign-dialog";
import { VerificationQueue } from "@/components/verification-queue";
import { money } from "@/lib/money";
import { getRecoveryData, getAssignableCustomers } from "@/lib/data/recovery";

const GRID = "minmax(180px,1.5fr) minmax(170px,1.4fr) 96px minmax(112px,1fr) minmax(112px,1fr) 104px";
const COLUMNS = [
  { label: "Officer", align: "left" as const },
  { label: "Zone", align: "left" as const },
  { label: "Accounts", align: "left" as const },
  { label: "Target", align: "right" as const },
  { label: "Collected", align: "right" as const },
  { label: "Assign", align: "right" as const },
];

export default async function RecoveryPage() {
  const [data, assignable] = await Promise.all([getRecoveryData(), getAssignableCustomers()]);
  const officerOptions = data.officers.map((o) => ({ id: o.id, name: o.name }));

  const rows: DataRow[] = data.officers.map((o) => ({
    key: o.id,
    cells: [
      { kind: "text", text: o.name, sub: "AVO", weight: 700 },
      { kind: "text", text: o.zone ?? "—", weight: 500 },
      { kind: "text", text: String(o.accountCount), sub: `${o.pendingCount} pending`, weight: 700 },
      { kind: "text", text: money(o.target), weight: 600, align: "right" },
      {
        kind: "text",
        text: o.collected ? money(o.collected) : "—",
        weight: 800,
        align: "right",
        fg: o.collected ? "var(--g700)" : "var(--ink3)",
      },
      {
        kind: "node",
        align: "right",
        node: (
          <AssignDialog
            customers={assignable}
            officers={officerOptions}
            defaultAvoId={o.id}
            trigger={
              <button className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2">
                Manage
              </button>
            }
          />
        ),
      },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="AVO & recovery" hint={`${data.officers.length} officers · ${data.assignedAccountsCount} accounts`}>
        <AssignDialog
          customers={assignable}
          officers={officerOptions}
          trigger={
            <button
              className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
              style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
            >
              Assign customers
            </button>
          }
        />
      </PageHeader>

      <div className="kpis">
        <StatTile
          label="Recovered today"
          value={money(data.recoveredToday)}
          note="From the field and office"
          tone="hero"
          icon={CheckCircle}
        />
        <StatTile label="Officers" value={String(data.officers.length)} note="All active" tone="plain" icon={UserCheck} />
        <StatTile
          label="Assigned accounts"
          value={String(data.assignedAccountsCount)}
          note={data.officers.length ? `About ${Math.round(data.assignedAccountsCount / data.officers.length)} per officer` : "—"}
          tone="plain"
          icon={Users}
        />
        <StatTile
          label="Verification pending"
          value={String(data.verifications.length)}
          note="House visits awaiting review"
          tone="warn"
          icon={ShieldAlert}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Officer performance</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={900} emptyMessage="No active officers yet." />
      </div>

      <VerificationQueue verifications={data.verifications} />
    </div>
  );
}
