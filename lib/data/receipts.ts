import { createClient } from "@/lib/supabase/server";
import type { CustomerMonthStatus } from "@/lib/types";
import { fetchOpenInstallments, summarizeAgreementsByCustomer } from "@/lib/data/agreements";
import type { CollectAgreement } from "@/components/collect-dialog";

export interface ReceiptRow {
  id: string;
  receiptNo: number;
  customerName: string;
  accNo: string;
  officerName: string;
  mode: string;
  amount: number;
  collectedAt: string;
}

export interface PendingCustomer {
  customerId: string;
  fullName: string;
  cell: string;
  accNo: string;
  avoName: string;
  agreements: CollectAgreement[];
}

export interface ReceiptsData {
  rows: ReceiptRow[];
  collectedToday: number;
  outstanding: number;
  cashInHand: number;
  pendingCustomers: PendingCustomer[];
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getReceiptsData(): Promise<ReceiptsData> {
  const supabase = await createClient();

  const [receiptsRes, statusRes, officersRes, openInst, cashRes, expensesRes, vendorPaymentsRes] = await Promise.all([
    supabase
      .from("receipts")
      .select("id, receipt_no, amount, mode, collected_at, customers(full_name, acc_no), profiles(full_name)")
      .gte("collected_at", startOfTodayISO())
      .order("collected_at", { ascending: false }),
    supabase.from("customer_month_status").select("*"),
    supabase.from("profiles").select("id, full_name").eq("role", "avo").eq("active", true),
    fetchOpenInstallments(supabase),
    supabase.from("receipts").select("amount").eq("account", "cash_in_hand"),
    supabase.from("expenses").select("amount").eq("account", "cash_in_hand"),
    supabase.from("vendor_payments").select("amount").eq("account", "cash_in_hand"),
  ]);

  if (receiptsRes.error) throw new Error(receiptsRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);
  if (officersRes.error) throw new Error(officersRes.error.message);
  if (cashRes.error) throw new Error(cashRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (vendorPaymentsRes.error) throw new Error(vendorPaymentsRes.error.message);

  type ReceiptRecord = {
    id: string;
    receipt_no: number;
    amount: number;
    mode: string;
    collected_at: string;
    customers: { full_name: string; acc_no: string } | null;
    profiles: { full_name: string } | null;
  };

  const receiptRecords = (receiptsRes.data ?? []) as unknown as ReceiptRecord[];
  const statusRows = (statusRes.data ?? []) as CustomerMonthStatus[];
  const officerProfiles = (officersRes.data ?? []) as { id: string; full_name: string }[];
  const officerNameById = new Map(officerProfiles.map((p) => [p.id, p.full_name]));
  const agreementsByCustomer = summarizeAgreementsByCustomer(openInst);

  const rows: ReceiptRow[] = receiptRecords.map((r) => ({
    id: r.id,
    receiptNo: r.receipt_no,
    customerName: r.customers?.full_name ?? "Customer",
    accNo: r.customers?.acc_no ?? "—",
    officerName: r.profiles?.full_name ?? "Office",
    mode: r.mode,
    amount: r.amount,
    collectedAt: r.collected_at,
  }));

  const collectedToday = rows.reduce((t, r) => t + r.amount, 0);
  const totalDue = statusRows.reduce((t, r) => t + Math.max(0, r.due_now ?? 0), 0);
  const outstanding = Math.max(0, totalDue - collectedToday);

  const cashIn = ((cashRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const cashOutExpenses = ((expensesRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const cashOutVendors = ((vendorPaymentsRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const cashInHand = cashIn - cashOutExpenses - cashOutVendors;

  const pendingCustomers: PendingCustomer[] = statusRows
    .filter((r) => (r.due_now ?? 0) > 0)
    .map((r) => ({
      customerId: r.customer_id,
      fullName: r.full_name,
      cell: r.cell,
      accNo: r.acc_no,
      avoName: r.avo_id ? officerNameById.get(r.avo_id) ?? "Unassigned" : "Unassigned",
      agreements: (agreementsByCustomer.get(r.customer_id) ?? [])
        .filter((a) => a.oldest)
        .map((a) => ({
          id: a.id,
          label: `Agreement #${a.agreementNo}${a.planMonths ? " · " + a.planMonths + " mo" : ""}`,
          monthly: a.oldest!.monthly,
          due: a.oldest!.due,
        })),
    }))
    .filter((c) => c.agreements.length > 0);

  return { rows, collectedToday, outstanding, cashInHand, pendingCustomers };
}

export interface ReceiptSlip {
  receiptNo: number;
  customerName: string;
  accNo: string;
  amount: number;
  mode: string;
  account: string;
  collectedAt: string;
  officerName: string;
  agreementNo: number;
}

export async function getReceiptSlip(id: string): Promise<ReceiptSlip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receipts")
    .select(
      "receipt_no, amount, mode, account, collected_at, customers(full_name, acc_no), profiles(full_name), agreements(agreement_no)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  type Row = {
    receipt_no: number;
    amount: number;
    mode: string;
    account: string;
    collected_at: string;
    customers: { full_name: string; acc_no: string } | null;
    profiles: { full_name: string } | null;
    agreements: { agreement_no: number } | null;
  };
  const r = data as unknown as Row;

  return {
    receiptNo: r.receipt_no,
    customerName: r.customers?.full_name ?? "Customer",
    accNo: r.customers?.acc_no ?? "—",
    amount: r.amount,
    mode: r.mode,
    account: r.account,
    collectedAt: r.collected_at,
    officerName: r.profiles?.full_name ?? "Office",
    agreementNo: r.agreements?.agreement_no ?? 0,
  };
}
