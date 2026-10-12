import { KeyRound, ShieldCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AccessDenied } from "@/components/access-denied";
import { AddLoginDialog, ChangeMyPasswordButton, ResetPasswordButton, ToggleLoginButton } from "@/components/login-dialogs";
import { getCurrentPermissions } from "@/lib/current-user";
import { getLoginsData } from "@/lib/data/logins";
import { ROLE_LABEL } from "@/lib/roles";
import { SHOP_TZ } from "@/lib/shop-time";

const GRID = "minmax(170px,1.4fr) minmax(130px,1fr) minmax(140px,1.1fr) 92px minmax(130px,1fr) minmax(250px,1.5fr)";
const COLUMNS = [
  { label: "Name", align: "left" as const },
  { label: "Role", align: "left" as const },
  { label: "Username", align: "left" as const },
  { label: "Status", align: "left" as const },
  { label: "Last login", align: "left" as const },
  { label: "Actions", align: "right" as const },
];

function lastLogin(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", { timeZone: SHOP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function LoginsPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageLogins) {
    return <AccessDenied title="Users & logins" note="Staff logins are managed by the owner." />;
  }

  const data = await getLoginsData(permissions.isSuper);

  const rows: DataRow[] = data.rows.map((r) => ({
    key: r.id,
    cells: [
      { kind: "text", text: r.fullName, sub: r.isMe ? "You" : undefined, weight: 700 },
      {
        kind: "chip",
        label: r.isSuper ? "Developer" : ROLE_LABEL[r.role],
        bg: r.role === "owner" ? "var(--g50)" : "var(--soft)",
        fg: r.role === "owner" ? "var(--g700)" : "var(--ink2)",
      },
      { kind: "text", text: r.loginId, weight: 600 },
      {
        kind: "chip",
        label: r.active ? "Active" : "Off",
        bg: r.active ? "var(--g50)" : "var(--red50)",
        fg: r.active ? "var(--g700)" : "var(--red)",
      },
      { kind: "text", text: lastLogin(r.lastSignIn), weight: 500 },
      {
        kind: "node",
        align: "right",
        node: r.canManage ? (
          <span className="flex gap-2 justify-end flex-wrap">
            <ResetPasswordButton row={r} />
            <ToggleLoginButton row={r} />
          </span>
        ) : (
          <span className="text-[11.5px] text-ink3">{r.isMe ? "Use “Change my password”" : "Managed by the developer"}</span>
        ),
      },
    ],
  }));

  const active = data.rows.filter((r) => r.active).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Users & logins" hint="Who can sign in, with what username, and what they can see">
        <ChangeMyPasswordButton />
        <AddLoginDialog employees={data.employeesWithoutLogin} canCreateOwner={permissions.isSuper} />
      </PageHeader>

      {!data.adminReady && (
        <div className="px-4 py-3 rounded-xl bg-amber50 text-[12.5px] font-semibold" style={{ color: "#8a5a10" }}>
          SUPABASE_SERVICE_ROLE_KEY isn&apos;t set on the server, so logins can be viewed but not created or reset.
        </div>
      )}

      <div className="kpis">
        <StatTile label="Logins" value={String(data.rows.length)} note={`${active} active`} tone="hero" icon={KeyRound} />
        <StatTile label="Turned off" value={String(data.rows.length - active)} note="Can't sign in" tone="plain" icon={UserX} />
        <StatTile
          label="Staff without a login"
          value={String(data.employeesWithoutLogin.length)}
          note="From the Employees register"
          tone={data.employeesWithoutLogin.length ? "warn" : "plain"}
          icon={ShieldCheck}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Logins</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={980} emptyMessage="No logins yet." />
        <p className="m-0 pb-3 text-[11.5px] text-ink3">
          Staff sign in with their username and password. Turning a login off signs them out and blocks access immediately; their records stay.
        </p>
      </div>
    </div>
  );
}
