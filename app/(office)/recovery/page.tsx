import { CheckCircle, UserCheck, Users, ShieldAlert, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AssignDialog } from "@/components/assign-dialog";
import { VerificationQueue } from "@/components/verification-queue";
import { money } from "@/lib/money";
import { getRecoveryData, getAssignableCustomers, getOfficerCustomers } from "@/lib/data/recovery";
import { STATUS_META } from "@/lib/status";
import { SHOP_TZ } from "@/lib/shop-time";
import Link from "next/link";
import { getCurrentPermissions } from "@/lib/current-user";

const GRID = "minmax(170px,1.4fr) minmax(150px,1.2fr) minmax(130px,1fr) minmax(104px,.9fr) minmax(104px,.9fr) 196px";
const COLUMNS = [
  { label: "Officer", align: "left" as const },
  { label: "Zone", align: "left" as const },
  { label: "Customers", align: "left" as const },
  { label: "Target", align: "right" as const },
  { label: "Collected", align: "right" as const },
  { label: "", align: "right" as const },
];
const LIST_GRID = "minmax(190px,1.5fr) minmax(130px,1fr) minmax(110px,.8fr) minmax(100px,.8fr) minmax(110px,.8fr) minmax(110px,.8fr)";
const LIST_COLUMNS = [
  { label: "Customer", align: "left" as const },
  { label: "Area", align: "left" as const },
  { label: "Status", align: "left" as const },
  { label: "Due now", align: "right" as const },
  { label: "Remaining", align: "right" as const },
  { label: "Assigned since", align: "right" as const },
];

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ officer?: string }> }) {
  const { officer: officerParam } = await searchParams;
  const [data, assignable, permissions] = await Promise.all([getRecoveryData(), getAssignableCustomers(), getCurrentPermissions()]);
  const officerOptions = data.officers.map((o) => ({ id: o.id, name: o.name }));
  const assignedCount = (id: string) => assignable.filter((c) => c.avoId === id).length;
  const selectedOfficer = officerParam === "none" ? "none" : data.officers.find((o) => o.id === officerParam)?.id;
  const officerCustomers = selectedOfficer ? await getOfficerCustomers(selectedOfficer) : null;
  const selectedName = selectedOfficer === "none" ? "No active officer" : data.officers.find((o) => o.id === selectedOfficer)?.name;

  const rows: DataRow[] = data.officers.map((o) => ({
    key: o.id,
    cells: [
      { kind: "text", text: o.name, sub: "AVO", weight: 700 },
      { kind: "text", text: o.zone ?? "—", weight: 500 },
      {
        kind: "node",
        node: (
          <Link href={`/recovery?officer=${o.id}#officer-customers`} className="flex flex-col text-ink" title="See this officer's customers">
            <span className="text-[13.5px] font-extrabold">
              {assignedCount(o.id)} customer{assignedCount(o.id) === 1 ? "" : "s"}
            </span>
            <span className="text-[11.5px] text-ink3">
              {o.accountCount} with a plan · {o.pendingCount} due
            </span>
          </Link>
        ),
      },
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
          <span className="flex gap-[6px] justify-end">
            <Link
              href={`/recovery?officer=${o.id}#officer-customers`}
              className="rounded-full px-[14px] py-2 text-xs font-bold"
              style={o.id === selectedOfficer ? { background: "var(--ink)", color: "#fff" } : { border: "1px solid var(--line)", background: "#fff", color: "var(--ink2)" }}
            >
              View
            </Link>
            <AssignDialog
              customers={assignable}
              officers={officerOptions}
              defaultAvoId={o.id}
              trigger={
                <button className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2">
                  Assign more
                </button>
              }
            />
          </span>
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
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={980} emptyMessage="No active officers yet." />
        {(orphaned > 0 || unassigned > 0) && (
          <Link href="/recovery?officer=none#officer-customers" className="self-start mb-3 text-[12.5px] font-bold text-amber">
            {orphaned + unassigned} customer{orphaned + unassigned === 1 ? "" : "s"} with no active officer — view →
          </Link>
        )}
      </div>

      {officerCustomers && (
        <div id="officer-customers" className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px] scroll-mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-[16.5px] font-extrabold m-0">
                {selectedOfficer === "none" ? "Customers with no active officer" : `${selectedName}'s customers`}
              </h2>
              <p className="m-0 mt-1 text-[12px] text-ink3">
                {officerCustomers.length} customer{officerCustomers.length === 1 ? "" : "s"} ·{" "}
                {officerCustomers.filter((c) => c.status).length} with an open plan ·{" "}
                {money(officerCustomers.reduce((t, c) => t + c.dueNow, 0))} due now
              </p>
            </div>
            <AssignDialog
              customers={assignable}
              officers={officerOptions}
              defaultAvoId={selectedOfficer === "none" ? undefined : selectedOfficer}
              trigger={
                <button className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2">
                  {selectedOfficer === "none" ? "Assign them" : "Move / assign customers"}
                </button>
              }
            />
            <Link href="/recovery" className="rounded-full px-[14px] py-2 text-xs font-bold border border-line bg-white text-ink2">
              Close
            </Link>
          </div>
          <DataTable
            gridTemplate={LIST_GRID}
            columns={LIST_COLUMNS}
            minWidth={820}
            emptyMessage={selectedOfficer === "none" ? "Every customer has an active officer." : "No customers assigned to this officer yet."}
            rows={officerCustomers.map((c) => {
              const meta = c.status ? STATUS_META[c.status] : null;
              return {
                key: c.id,
                cells: [
                  {
                    kind: "node",
                    node: (
                      <Link href={`/customers/${c.id}`} className="flex flex-col text-ink">
                        <span className="text-[13px] font-bold">{c.fullName}</span>
                        <span className="text-[11px] text-ink3">
                          Acc {c.accNo} · {c.cell}
                          {selectedOfficer === "none" ? ` · ${c.officerName}${c.officerActive ? "" : c.officerName === "Unassigned" ? "" : " (inactive)"}` : ""}
                        </span>
                      </Link>
                    ),
                  },
                  { kind: "text", text: c.area ?? "—", weight: 500 },
                  meta
                    ? { kind: "chip", label: meta.label, bg: meta.chipBg, fg: meta.chipFg }
                    : { kind: "text", text: "No open plan", weight: 500, fg: "var(--ink3)" },
                  { kind: "text", text: c.dueNow ? money(c.dueNow) : "—", weight: 700, align: "right" },
                  { kind: "text", text: c.remaining ? money(c.remaining) : "—", weight: 600, align: "right" },
                  {
                    kind: "text",
                    text: c.assignedSince
                      ? new Date(c.assignedSince).toLocaleDateString("en-US", { timeZone: SHOP_TZ, day: "numeric", month: "short", year: "numeric" })
                      : "—",
                    weight: 500,
                    align: "right",
                  },
                ],
              };
            })}
          />
        </div>
      )}

      <VerificationQueue verifications={data.verifications} canReject={permissions.role === "owner" || permissions.role === "manager"} />
    </div>
  );
}
