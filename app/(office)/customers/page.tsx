import { CustomerRegister, type RegisterItem } from "@/components/customer-register";
import { RowActions } from "@/components/row-actions";
import { STATUS_META } from "@/lib/status";
import { money } from "@/lib/money";
import { getCustomersData } from "@/lib/data/customers";

const GRID = "minmax(190px,1.8fr) minmax(160px,1.4fr) 86px minmax(105px,1fr) minmax(112px,1fr) 112px 100px";

// Search, tab and officer filters are applied client-side in <CustomerRegister>,
// so this page loads the full register once and typing in the search box stays instant.
export default async function CustomersPage() {
  const data = await getCustomersData();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const officers = Array.from(new Set(data.rows.map((r) => r.avoName))).filter((n) => n !== "Unassigned").sort();

  const items: RegisterItem[] = data.rows.map((r) => {
    const meta = STATUS_META[r.status];
    const agreementCount = r.agreements.length;
    const planCell =
      agreementCount === 0
        ? { text: "No plan", sub: "—" }
        : agreementCount === 1
          ? {
              text: `${r.agreements[0].planMonths ?? "—"} mo`,
              sub: `${r.agreements[0].paidCount}/${r.agreements[0].totalCount} paid`,
            }
          : { text: `${agreementCount} agreements`, sub: "see ledger" };
    const monthlyTotal = r.agreements.reduce((t, a) => t + a.monthly, 0);
    const priceTotal = r.agreements.reduce((t, a) => t + a.totalPrice, 0);

    return {
      search: [r.fullName, r.accNo, r.cell, r.area ?? "", r.g1Name ?? "", r.g2Name ?? "", r.g1Cell ?? "", r.g2Cell ?? ""]
        .join(" ")
        .toLowerCase(),
      status: r.status,
      avoName: r.avoName,
      dueNow: r.dueNow,
      row: {
        key: r.customerId,
        cells: [
          { kind: "text", text: r.fullName, sub: `Acc ${r.accNo} · ${r.cell}`, weight: 700 },
          {
            kind: "text",
            text: `${r.g1Name ?? "—"} / ${r.g2Name ?? "—"}`,
            sub: `${r.g1Cell ?? "—"} · ${r.g2Cell ?? "—"}`,
            weight: 500,
          },
          { kind: "text", text: planCell.text, sub: planCell.sub, weight: 700 },
          {
            kind: "text",
            text: agreementCount > 0 ? money(monthlyTotal) : "—",
            sub: agreementCount > 0 ? "price " + money(priceTotal) : "",
            weight: 600,
            align: "right",
          },
          {
            kind: "text",
            text: r.dueNow > 0 ? money(r.dueNow) : "—",
            sub: r.carry > 0 ? "incl " + money(r.carry) + " carry" : "",
            weight: 800,
            align: "right",
            fg: r.dueNow > 0 && (r.status === "overdue" || r.status === "default") ? "var(--red)" : undefined,
          },
          { kind: "chip", label: meta.label, bg: meta.chipBg, fg: meta.chipFg },
          {
            kind: "node",
            align: "right",
            node: (
              <RowActions
                customerId={r.customerId}
                customerName={r.fullName}
                cell={r.cell}
                accNo={r.accNo}
                avoName={r.avoName}
                dueNow={r.dueNow}
                monthLabel={monthLabel}
                agreements={r.collectAgreements}
              />
            ),
          },
        ],
      },
    };
  });

  return (
    <CustomerRegister
      items={items}
      officers={officers}
      monthLabel={monthLabel}
      gridTemplate={GRID}
      columns={COLUMNS}
      totalDue={data.totalDue}
      collectedThisMonth={data.collectedThisMonth}
      outstanding={data.outstanding}
      bookValue={data.bookValue}
      newThisMonthCount={data.newThisMonthCount}
    />
  );
}

const COLUMNS = [
  { label: "Customer", align: "left" as const },
  { label: "Guarantors", align: "left" as const },
  { label: "Plan", align: "left" as const },
  { label: "Monthly", align: "right" as const },
  { label: "Due now", align: "right" as const },
  { label: "Status", align: "left" as const },
  { label: "Action", align: "right" as const },
];
