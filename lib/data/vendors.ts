import { createClient } from "@/lib/supabase/server";
import { shopMonthStartStr } from "@/lib/shop-time";

export interface VendorRow {
  id: string;
  name: string;
  cell: string | null;
  billCount: number;
  lastBillDate: string | null;
  payable: number;
}

export interface VendorsData {
  rows: VendorRow[];
  totalPayable: number;
  vendorsWithBalance: number;
  billsThisMonth: number;
  paidThisMonth: number;
}


export async function getVendorsData(): Promise<VendorsData> {
  const supabase = await createClient();

  const [vendorsRes, purchasesRes, paymentsRes] = await Promise.all([
    supabase.from("vendors").select("id, name, cell, opening_balance").order("name"),
    supabase.from("purchases").select("vendor_id, bill_date, total"),
    supabase.from("vendor_payments").select("vendor_id, amount, paid_on"),
  ]);

  if (vendorsRes.error) throw new Error(vendorsRes.error.message);
  if (purchasesRes.error) throw new Error(purchasesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  type VendorRecord = { id: string; name: string; cell: string | null; opening_balance: number };
  type PurchaseRecord = { vendor_id: string; bill_date: string; total: number };
  type PaymentRecord = { vendor_id: string; amount: number; paid_on: string };

  const vendors = (vendorsRes.data ?? []) as VendorRecord[];
  const purchases = (purchasesRes.data ?? []) as PurchaseRecord[];
  const payments = (paymentsRes.data ?? []) as PaymentRecord[];

  const monthStart = shopMonthStartStr();

  const rows: VendorRow[] = vendors.map((v) => {
    const mine = purchases.filter((p) => p.vendor_id === v.id);
    const minePayments = payments.filter((p) => p.vendor_id === v.id);
    const billTotal = mine.reduce((t, p) => t + p.total, 0);
    const paidTotal = minePayments.reduce((t, p) => t + p.amount, 0);
    const lastBillDate = mine.reduce<string | null>(
      (latest, p) => (!latest || p.bill_date > latest ? p.bill_date : latest),
      null
    );
    return {
      id: v.id,
      name: v.name,
      cell: v.cell,
      billCount: mine.length,
      lastBillDate,
      payable: Math.max(0, v.opening_balance + billTotal - paidTotal),
    };
  });

  const totalPayable = rows.reduce((t, r) => t + r.payable, 0);
  const vendorsWithBalance = rows.filter((r) => r.payable > 0).length;
  const billsThisMonth = purchases.filter((p) => p.bill_date >= monthStart).length;
  const paidThisMonth = payments.filter((p) => p.paid_on >= monthStart).reduce((t, p) => t + p.amount, 0);

  return { rows, totalPayable, vendorsWithBalance, billsThisMonth, paidThisMonth };
}

export interface VendorPaymentRow {
  id: string;
  vendorName: string;
  amount: number;
  account: string;
  paidOn: string;
  notes: string | null;
}

export async function getVendorPaymentsHistory(): Promise<VendorPaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_payments")
    .select("id, amount, account, paid_on, notes, vendors(name)")
    .order("paid_on", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  type PaymentRecord = {
    id: string;
    amount: number;
    account: string;
    paid_on: string;
    notes: string | null;
    vendors: { name: string } | null;
  };

  return ((data ?? []) as unknown as PaymentRecord[]).map((p) => ({
    id: p.id,
    vendorName: p.vendors?.name ?? "Vendor",
    amount: p.amount,
    account: p.account,
    paidOn: p.paid_on,
    notes: p.notes,
  }));
}
