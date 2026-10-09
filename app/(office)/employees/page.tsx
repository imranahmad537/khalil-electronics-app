import { Wallet, MapPin, Users, Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AddEmployeeDialog, EmployeeProfileButton } from "@/components/employee-dialog";
import { money } from "@/lib/money";
import { ROLE_LABEL } from "@/lib/roles";
import { getEmployeesData } from "@/lib/data/employees";
import { getCurrentPermissions } from "@/lib/current-user";
import { AccessDenied } from "@/components/access-denied";

const GRID = "minmax(180px,1.6fr) minmax(140px,1.1fr) minmax(140px,1fr) minmax(112px,1fr) 112px 104px";
const COLUMNS = [
  { label: "Name", align: "left" as const },
  { label: "Role", align: "left" as const },
  { label: "Contact", align: "left" as const },
  { label: "Salary", align: "right" as const },
  { label: "Joined", align: "left" as const },
  { label: "Action", align: "right" as const },
];

function nextPayrollNote() {
  const now = new Date();
  const payDay = 25;
  let target = new Date(now.getFullYear(), now.getMonth(), payDay);
  if (now.getDate() > payDay) target = new Date(now.getFullYear(), now.getMonth() + 1, payDay);
  const days = Math.round((target.getTime() - now.getTime()) / 86400000);
  return {
    value: target.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
    note: days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} from today`,
  };
}

export default async function EmployeesPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageEmployees) {
    return <AccessDenied title="Employees" note="Staff records and payroll are visible to owners and managers only." />;
  }

  const data = await getEmployeesData();
  const payroll = nextPayrollNote();

  const rows: DataRow[] = data.rows.map((e) => ({
    key: e.id,
    cells: [
      { kind: "text", text: e.fullName, weight: 700 },
      {
        kind: "chip",
        label: ROLE_LABEL[e.role],
        bg: e.role === "avo" ? "var(--g50)" : "var(--soft)",
        fg: e.role === "avo" ? "var(--g700)" : "var(--ink2)",
      },
      { kind: "text", text: e.cell ?? "—", weight: 500 },
      { kind: "text", text: money(e.salary), weight: 700, align: "right" },
      {
        kind: "text",
        text: e.joinedOn
          ? new Date(e.joinedOn).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "—",
        weight: 500,
      },
      { kind: "node", align: "right", node: <EmployeeProfileButton employee={e} /> },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Employees" hint={`${data.rows.length} staff · ${data.fieldOfficerCount} field`}>
        <AddEmployeeDialog />
      </PageHeader>

      <div className="kpis">
        <StatTile
          label="Monthly payroll"
          value={money(data.monthlyPayroll)}
          note={`Gross, ${data.rows.length} staff`}
          tone="hero"
          icon={Wallet}
        />
        <StatTile
          label="Field officers"
          value={String(data.fieldOfficerCount)}
          note={`Holding ${data.assignedAccountsCount} accounts`}
          tone="plain"
          icon={MapPin}
        />
        <StatTile label="Office staff" value={String(data.officeStaffCount)} note="Sales, accounts, management" tone="plain" icon={Users} />
        <StatTile label="Payroll due" value={payroll.value} note={payroll.note} tone="warn" icon={Calendar} />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Staff register</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={900} emptyMessage="No staff recorded yet." />
      </div>
    </div>
  );
}
