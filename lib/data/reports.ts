import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { shopMonthRange, shopMonthStartStr } from "@/lib/shop-time";
import type { CustomerMonthStatus } from "@/lib/types";
import { toGuarantorBriefs, type GuarantorBrief } from "@/lib/guarantors";

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

  const { data, error } = await fetchAll((a, b) =>
      supabase
    .from("receipts")
    .select("id, receipt_no, amount, account, collected_at, customers(full_name, acc_no), profiles(full_name)")
    .gte("collected_at", startISO)
    .lt("collected_at", endISO)
    .order("collected_at", { ascending: false })
        .order("id")
        .range(a, b)
    );

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
  guarantors: GuarantorBrief[];
  noGuarantorReason: string | null;
  dueAmount: number;
  monthsBehind: number;
}

export async function getInstallmentsReceivableReport() {
  const supabase = await createClient();
  const { data, error } = await fetchAll((a, b) =>
      supabase
    .from("installments")
    .select(
      "agreement_id, due_amount, carry_in, paid, due_month, agreements!inner(id, agreement_no, status, customers(full_name, acc_no, no_guarantor_reason, guarantors(slot, full_name, cell)))"
    )
    .eq("agreements.status", "open")
    .neq("status", "paid")
        .order("id")
        .range(a, b)
    );

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
      customers: {
        full_name: string;
        acc_no: string;
        no_guarantor_reason: string | null;
        guarantors: { slot: number; full_name: string; cell: string | null }[];
      } | null;
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
      byAgreement.set(r.agreement_id, {
        agreementId: ag.id,
        agreementNo: ag.agreement_no,
        customerName: ag.customers.full_name,
        accNo: ag.customers.acc_no,
        guarantors: toGuarantorBriefs(ag.customers.guarantors),
        noGuarantorReason: ag.customers.no_guarantor_reason,
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
    fetchAll((a, b) => supabase.from("customer_month_status").select("*").gt("due_now", 0).order("full_name").order("customer_id").range(a, b)),
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
  guarantors: GuarantorBrief[];
  noGuarantorReason: string | null;
}

export async function getDefaulterList() {
  const supabase = await createClient();
  const { data, error } = await fetchAll((a, b) =>
      supabase
    .from("customer_month_status")
    .select("*")
    .eq("status", "default")
    .order("due_now", { ascending: false })
        .order("customer_id")
        .range(a, b)
    );
  if (error) throw new Error(error.message);

  const statusRows = (data ?? []) as CustomerMonthStatus[];

  // The status view only carries guarantors 1 and 2; load the full list (and any waiver) per defaulter.
  type GuarantorInfo = {
    id: string;
    no_guarantor_reason: string | null;
    guarantors: { slot: number; full_name: string; cell: string | null }[];
  };
  const infoById = new Map<string, GuarantorInfo>();
  const ids = statusRows.map((r) => r.customer_id);
  for (let i = 0; i < ids.length; i += 200) {
    const res = await supabase
      .from("customers")
      .select("id, no_guarantor_reason, guarantors(slot, full_name, cell)")
      .in("id", ids.slice(i, i + 200));
    if (res.error) throw new Error(res.error.message);
    for (const c of (res.data ?? []) as unknown as GuarantorInfo[]) infoById.set(c.id, c);
  }

  const rows: DefaulterRow[] = statusRows.map((r) => ({
    customerId: r.customer_id,
    customerName: r.full_name,
    accNo: r.acc_no,
    cell: r.cell,
    monthsBehind: r.months_behind ?? 0,
    dueNow: Math.max(0, r.due_now ?? 0),
    guarantors: toGuarantorBriefs(infoById.get(r.customer_id)?.guarantors),
    noGuarantorReason: infoById.get(r.customer_id)?.no_guarantor_reason ?? null,
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
  const { data, error } = await fetchAll((a, b) => supabase.from("customers").select("id, full_name, acc_no, cell").order("full_name").order("id").range(a, b));
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
    fetchAll((a, b) => supabase.from("receipts").select("amount").gte("collected_at", startISO).lt("collected_at", endISO).order("id").range(a, b)),
    fetchAll((a, b) => supabase.from("expenses").select("amount").gte("spent_on", startDate).lt("spent_on", endDate).order("id").range(a, b)),
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

// ---------- Customer list ----------
// One row per live agreement (pending / open); customers with none get a single row with blanks.
export interface CustomerListReportRow {
  key: string;
  customerId: string;
  accNo: string;
  fullName: string;
  cell: string;
  guarantors: GuarantorBrief[];
  noGuarantorReason: string | null;
  agreementNo: number | null;
  totalPrice: number | null;
  planMonths: number | null;
  paidCount: number;
  installmentCount: number;
  monthly: number | null;
  advance: number | null;
  remaining: number | null;
}

export interface CustomerListReport {
  rows: CustomerListReportRow[];
  customerCount: number;
  totalPrice: number;
  totalAdvance: number;
  totalRemaining: number;
}

export async function getCustomerListReport(): Promise<CustomerListReport> {
  const supabase = await createClient();
  const { data, error } = await fetchAll((a, b) =>
    supabase
      .from("customers")
      .select(
        "id, acc_no, full_name, cell, no_guarantor_reason, guarantors(slot, full_name, cell), agreements(id, agreement_no, plan_months, total_price, advance, monthly, status, installments(status), receipts(amount))"
      )
      .order("full_name")
      .order("id")
      .range(a, b)
  );
  if (error) throw new Error(error.message);

  type CustomerRecord = {
    id: string;
    acc_no: string;
    full_name: string;
    cell: string;
    no_guarantor_reason: string | null;
    guarantors: { slot: number; full_name: string; cell: string | null }[];
    agreements: {
      id: string;
      agreement_no: number;
      plan_months: number | null;
      total_price: number;
      advance: number;
      monthly: number;
      status: string;
      installments: { status: string }[];
      receipts: { amount: number }[];
    }[];
  };

  const rows: CustomerListReportRow[] = [];
  for (const c of (data ?? []) as unknown as CustomerRecord[]) {
    const base = {
      customerId: c.id,
      accNo: c.acc_no,
      fullName: c.full_name,
      cell: c.cell,
      guarantors: toGuarantorBriefs(c.guarantors),
      noGuarantorReason: c.no_guarantor_reason,
    };
    const live = c.agreements
      .filter((a) => a.status === "open" || a.status === "pending_verification")
      .sort((x, y) => x.agreement_no - y.agreement_no);

    if (live.length === 0) {
      rows.push({
        ...base,
        key: c.id,
        agreementNo: null,
        totalPrice: null,
        planMonths: null,
        paidCount: 0,
        installmentCount: 0,
        monthly: null,
        advance: null,
        remaining: null,
      });
      continue;
    }
    for (const a of live) {
      // Receipts include the advance taken at signing, so this is what's left to recover.
      const received = (a.receipts ?? []).reduce((t, r) => t + Number(r.amount), 0);
      rows.push({
        ...base,
        key: a.id,
        agreementNo: a.agreement_no,
        totalPrice: Number(a.total_price),
        planMonths: a.plan_months,
        paidCount: a.installments.filter((i) => i.status === "paid").length,
        installmentCount: a.installments.length,
        monthly: Number(a.monthly),
        advance: Number(a.advance),
        remaining: Math.max(0, Number(a.total_price) - received),
      });
    }
  }

  return {
    rows,
    customerCount: (data ?? []).length,
    totalPrice: rows.reduce((t, r) => t + (r.totalPrice ?? 0), 0),
    totalAdvance: rows.reduce((t, r) => t + (r.advance ?? 0), 0),
    totalRemaining: rows.reduce((t, r) => t + (r.remaining ?? 0), 0),
  };
}
