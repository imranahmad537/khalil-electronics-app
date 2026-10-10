import { createClient } from "@/lib/supabase/server";
import { shopMonthRange, shopMonthStartStr } from "@/lib/shop-time";
import type { CustomerMonthStatus } from "@/lib/types";

// Month bounds on the shop calendar (Asia/Karachi), not the server's.
function monthRange(monthKey?: string) {
  const r = shopMonthRange(monthKey);
  return { ...r, start: new Date(r.startISO), end: new Date(r.endISO) };
}

// ---------- Installments received ----------
export interface ReceivedRow {
  id: string;
  receiptNo: number;
  collectedAt: string;
  customerName: string;
  accNo: string;
  officerName: string;
  account: string;
  amount: number;
}

export async function getInstallmentsReceivedReport(monthKey?: string) {
  const supabase = await createClient();
  const { startISO, endISO } = monthRange(monthKey);

  const { data, error } = await supabase
    .from("receipts")
    .select("id, receipt_no, amount, account, collected_at, customers(full_name, acc_no), profiles(full_name)")
    .gte("collected_at", startISO)
    .lt("collected_at", endISO)
    .order("collected_at", { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    receipt_no: number;
    amount: number;
    account: string;
    collected_at: string;
    customers: { full_name: string; acc_no: string } | null;
    profiles: { full_name: string } | null;
  };
  const rows: ReceivedRow[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    receiptNo: r.receipt_no,
    collectedAt: r.collected_at,
    customerName: r.customers?.full_name ?? "Customer",
    accNo: r.customers?.acc_no ?? "—",
    officerName: r.profiles?.full_name ?? "Office",
    account: r.account,
    amount: r.amount,
  }));

  return { rows, total: rows.reduce((t, r) => t + r.amount, 0) };
}

// ---------- Installments receivable ----------
export interface ReceivableRow {
  agreementId: string;
  agreementNo: number;
  customerName: string;
  accNo: string;
  g1: string;
  g2: string;
  dueAmount: number;
  monthsBehind: number;
}

export async function getInstallmentsReceivableReport() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .select(
      "agreement_id, due_amount, carry_in, paid, due_month, agreements!inner(id, agreement_no, status, customers(full_name, acc_no, guarantors(slot, full_name)))"
    )
    .eq("agreements.status", "open")
    .neq("status", "paid");

  if (error) throw new Error(error.message);

  type Row = {
    agreement_id: string;
    due_amount: number;
    carry_in: number;
    paid: number;
    due_month: string;
    agreements: {
      id: string;
      agreement_no: number;
      customers: { full_name: string; acc_no: string; guarantors: { slot: number; full_name: string }[] } | null;
    } | null;
  };

  const byAgreement = new Map<string, ReceivableRow>();
  const monthStart = shopMonthStartStr();

  for (const r of (data ?? []) as unknown as Row[]) {
    const ag = r.agreements;
    if (!ag?.customers) continue;
    const owed = r.due_amount + r.carry_in - r.paid;
    if (owed <= 0) continue;
    const existing = byAgreement.get(r.agreement_id);
    const behind = r.due_month < monthStart ? 1 : 0;
    if (existing) {
      existing.dueAmount += owed;
      existing.monthsBehind += behind;
    } else {
      const g1 = ag.customers.guarantors.find((g) => g.slot === 1)?.full_name ?? "—";
      const g2 = ag.customers.guarantors.find((g) => g.slot === 2)?.full_name ?? "—";
      byAgreement.set(r.agreement_id, {
        agreementId: ag.id,
        agreementNo: ag.agreement_no,
        customerName: ag.customers.full_name,
        accNo: ag.customers.acc_no,
        g1,
        g2,
        dueAmount: owed,
        monthsBehind: behind,
      });
    }
  }

  const rows = [...byAgreement.values()].sort((a, b) => b.dueAmount - a.dueAmount);
  return { rows, total: rows.reduce((t, r) => t + r.dueAmount, 0) };
}

// ---------- Daily recovery sheet ----------
export interface RecoverySheetRow {
  officerName: string;
  customerName: string;
  accNo: string;
  cell: string;
  area: string | null;
  dueNow: number;
}

export async function getDailyRecoverySheet() {
  const supabase = await createClient();
  const [statusRes, officersRes] = await Promise.all([
    supabase.from("customer_month_status").select("*").gt("due_now", 0).order("full_name"),
    supabase.from("profiles").select("id, full_name").eq("role", "avo").eq("active", true),
  ]);
  if (statusRes.error) throw new Error(statusRes.error.message);
  if (officersRes.error) throw new Error(officersRes.error.message);

  const officerNameById = new Map(((officersRes.data ?? []) as { id: string; full_name: string }[]).map((o) => [o.id, o.full_name]));
  const rows: RecoverySheetRow[] = ((statusRes.data ?? []) as CustomerMonthStatus[]).map((r) => ({
    officerName: r.avo_id ? officerNameById.get(r.avo_id) ?? "Unassigned" : "Unassigned",
    customerName: r.full_name,
    accNo: r.acc_no,
    cell: r.cell,
    area: r.area,
    dueNow: Math.max(0, r.due_now ?? 0),
  }));

  rows.sort((a, b) => a.officerName.localeCompare(b.officerName) || b.dueNow - a.dueNow);
  return { rows, total: rows.reduce((t, r) => t + r.dueNow, 0) };
}

// ---------- Defaulter list ----------
export interface DefaulterRow {
  customerId: string;
  customerName: string;
  accNo: string;
  cell: string;
  monthsBehind: number;
  dueNow: number;
  g1Name: string | null;
  g1Cell: string | null;
  g2Name: string | null;
  g2Cell: string | null;
}

export async function getDefaulterList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_month_status")
    .select("*")
    .eq("status", "default")
    .order("due_now", { ascending: false });
  if (error) throw new Error(error.message);

  const rows: DefaulterRow[] = ((data ?? []) as CustomerMonthStatus[]).map((r) => ({
    customerId: r.customer_id,
    customerName: r.full_name,
    accNo: r.acc_no,
    cell: r.cell,
    monthsBehind: r.months_behind ?? 0,
    dueNow: Math.max(0, r.due_now ?? 0),
    g1Name: r.g1_name,
    g1Cell: r.g1_cell,
    g2Name: r.g2_name,
    g2Cell: r.g2_cell,
  }));

  return { rows, total: rows.reduce((t, r) => t + r.dueNow, 0) };
}

// ---------- Customer ledger (index for the picker) ----------
export interface LedgerIndexRow {
  id: string;
  fullName: string;
  accNo: string;
  cell: string;
}

export async function getCustomerLedgerIndex(): Promise<LedgerIndexRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("id, full_name, acc_no, cell").order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ id: c.id, fullName: c.full_name, accNo: c.acc_no, cell: c.cell }));
}

// ---------- Profit & loss ----------
export interface ProfitLossReport {
  salesThisMonth: number;
  cogs: number;
  grossMargin: number;
  recoveryThisMonth: number;
  expensesThisMonth: number;
  netCashPosition: number;
}

export async function getProfitLossReport(monthKey?: string): Promise<ProfitLossReport> {
  const supabase = await createClient();
  const { startISO, endISO, startDate, endDate } = monthRange(monthKey);

  const [agreementsRes, receiptsRes, expensesRes] = await Promise.all([
    supabase
      .from("agreements")
      .select("id, sale_type, total_price, opened_on, agreement_items(qty, products(cost))")
      .neq("status", "cancelled")
      .gte("opened_on", startDate)
      .lt("opened_on", endDate),
    supabase.from("receipts").select("amount").gte("collected_at", startISO).lt("collected_at", endISO),
    supabase.from("expenses").select("amount").gte("spent_on", startDate).lt("spent_on", endDate),
  ]);

  if (agreementsRes.error) throw new Error(agreementsRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);

  type AgreementRow = {
    id: string;
    sale_type: string;
    total_price: number;
    agreement_items: { qty: number; products: { cost: number } | null }[];
  };
  const agreements = (agreementsRes.data ?? []) as unknown as AgreementRow[];

  const salesThisMonth = agreements.reduce((t, a) => t + a.total_price, 0);
  const cogs = agreements.reduce(
    (t, a) => t + a.agreement_items.reduce((s, it) => s + it.qty * (it.products?.cost ?? 0), 0),
    0
  );
  const recoveryThisMonth = ((receiptsRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const expensesThisMonth = ((expensesRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);

  return {
    salesThisMonth,
    cogs,
    grossMargin: salesThisMonth - cogs,
    recoveryThisMonth,
    expensesThisMonth,
    // receipts already include signing-day money and direct sales (create_sale writes them)
    netCashPosition: recoveryThisMonth - expensesThisMonth,
  };
}
