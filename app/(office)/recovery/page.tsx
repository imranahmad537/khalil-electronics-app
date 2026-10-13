import { CheckCircle, UserCheck, Users, ShieldAlert, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AssignDialog } from "@/components/assign-dialog";
import { VerificationQueue } from "@/components/verification-queue";
import { money } from "@/lib/money";
import { getRecoveryData, getAssignableCustomers } from "@/lib/data/recovery";
import { getCurrentPermissions } from "@/lib/current-user";

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
  const [data, assignable, permissions] = await Promise.all([getRecoveryData(), getAssignableCustomers(), getCurrentPermissions()]);
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

  const orphaned = assignable.filter((c) => c.avoId && !c.avoActive).length;
  const unassigned = assignable.filter((c) => !c.avoId).length;

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

      {(orphaned > 0 || unassigned > 0) && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl bg-amber50 text-[12.5px] font-semibold" style={{ color: "#8a5a10" }}>
          <AlertTriangle size={16} strokeWidth={2.4} />
          <span className="flex-1 min-w-[220px]">
            {[
              orphaned > 0 ? `${orphaned} customer${orphaned === 1 ? "" : "s"} belong to a deactivated officer` : "",
              unassigned > 0 ? `${unassigned} have no officer` : "",
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            — nobody is visiting them for collection.
          </span>
          <AssignDialog
            customers={assignable}
            officers={officerOptions}
            trigger={<button className="rounded-full px-[14px] py-[7px] text-[12px] font-bold border border-line bg-white text-ink cursor-pointer">Assign them</button>}
          />
        </div>
      )}

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
          value={String(data.verifications.filter((v) => v.status === "pending").length)}
          note="House visits awaiting the AVO"
          tone="warn"
          icon={ShieldAlert}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Officer performance</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={900} emptyMessage="No active officers yet." />
      </div>

      <VerificationQueue verifications={data.verifications} canReject={permissions.role === "owner" || permissions.role === "manager"} />
    </div>
  );
}
