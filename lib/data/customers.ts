import { createClient } from "@/lib/supabase/server";
import { shopMonthStartISO } from "@/lib/shop-time";
import type { CustomerMonthStatus, CustomerStatus } from "@/lib/types";
import { fetchOpenInstallments, summarizeAgreementsByCustomer, type AgreementSummary } from "@/lib/data/agreements";
import type { CollectAgreement } from "@/components/collect-dialog";

export interface CustomerListRow {
  customerId: string;
  accNo: string;
  fullName: string;
  cell: string;
  area: string | null;
  avoName: string;
  g1Name: string | null;
  g1Cell: string | null;
  g2Name: string | null;
  g2Cell: string | null;
  status: CustomerStatus;
  dueNow: number;
  remaining: number;
  carry: number;
  monthsBehind: number;
  agreements: AgreementSummary[];
  collectAgreements: CollectAgreement[];
}

export interface CustomersData {
  rows: CustomerListRow[];
  totalDue: number;
  collectedThisMonth: number;
  outstanding: number;
  newThisMonthCount: number;
  bookValue: number;
}


const NO_ACTIVE_PLAN: CustomerStatus = "paid";

export async function getCustomersData(): Promise<CustomersData> {
  const supabase = await createClient();

  const [customersRes, statusRes, officersRes, openInst, receiptsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, acc_no, full_name, cell, area, avo_id, created_at, guarantors(slot, full_name, cell)")
      .order("full_name"),
    supabase.from("customer_month_status").select("*"),
    supabase.from("profiles").select("id, full_name").eq("role", "avo").eq("active", true),
    fetchOpenInstallments(supabase),
    supabase.from("receipts").select("amount").gte("collected_at", shopMonthStartISO()),
  ]);

  if (customersRes.error) throw new Error(customersRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);
  if (officersRes.error) throw new Error(officersRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);

  type CustomerRecord = {
    id: string;
    acc_no: string;
    full_name: string;
    cell: string;
    area: string | null;
    avo_id: string | null;
    created_at: string;
    guarantors: { slot: number; full_name: string; cell: string | null }[];
  };

  const customers = (customersRes.data ?? []) as unknown as CustomerRecord[];
  const statusByCustomer = new Map((statusRes.data as CustomerMonthStatus[]).map((r) => [r.customer_id, r]));
  const officerProfiles = (officersRes.data ?? []) as { id: string; full_name: string }[];
  const officerNameById = new Map(officerProfiles.map((p) => [p.id, p.full_name]));
  const agreementsByCustomer = summarizeAgreementsByCustomer(openInst);

  const thisMonthStart = new Date(shopMonthStartISO());

  const rows: CustomerListRow[] = customers.map((c) => {
    const statusRow = statusByCustomer.get(c.id);
    const g1 = c.guarantors.find((g) => g.slot === 1);
    const g2 = c.guarantors.find((g) => g.slot === 2);
    const agreements = agreementsByCustomer.get(c.id) ?? [];

    const collectAgreements: CollectAgreement[] = agreements
      .filter((a) => a.oldest)
      .map((a) => ({
        id: a.id,
        label: `Agreement #${a.agreementNo}${a.planMonths ? " · " + a.planMonths + " mo" : ""}`,
        monthly: a.oldest!.monthly,
        due: a.oldest!.due,
      }));

    return {
      customerId: c.id,
      accNo: c.acc_no,
      fullName: c.full_name,
      cell: c.cell,
      area: c.area,
      avoName: c.avo_id ? officerNameById.get(c.avo_id) ?? "Unassigned" : "Unassigned",
      g1Name: g1?.full_name ?? null,
      g1Cell: g1?.cell ?? null,
      g2Name: g2?.full_name ?? null,
      g2Cell: g2?.cell ?? null,
      status: statusRow?.status ?? NO_ACTIVE_PLAN,
      dueNow: Math.max(0, statusRow?.due_now ?? 0),
      remaining: Math.max(0, statusRow?.remaining ?? 0),
      carry: statusRow?.carry ?? 0,
      monthsBehind: statusRow?.months_behind ?? 0,
      agreements,
      collectAgreements,
    };
  });

  const totalDue = rows.reduce((t, r) => t + r.dueNow, 0);
  const collectedThisMonth = ((receiptsRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const outstanding = Math.max(0, totalDue - collectedThisMonth);
  const newThisMonthCount = customers.filter((c) => new Date(c.created_at) >= thisMonthStart).length;
  const bookValue = rows.reduce((t, r) => t + r.remaining, 0);

  return { rows, totalDue, collectedThisMonth, outstanding, newThisMonthCount, bookValue };
}

export interface LedgerItem {
  productName: string;
  qty: number;
  unitPrice: number;
  serialNo: string | null;
}

export interface LedgerInstallment {
  seq: number;
  dueMonth: string;
  dueAmount: number;
  carryIn: number;
  paid: number;
  status: string;
  owed: number;
}

export interface LedgerAgreement {
  id: string;
  agreementNo: number;
  saleType: string;
  planMonths: number | null;
  totalPrice: number;
  advance: number;
  monthly: number;
  openedOn: string;
  status: string;
  closedOn: string | null;
  items: LedgerItem[];
  installments: LedgerInstallment[];
  collect: CollectAgreement | null;
}

export interface LedgerReceipt {
  id: string;
  amount: number;
  mode: string;
  collectedAt: string;
  collectedBy: string | null;
}

export interface CustomerLedger {
  customer: {
    id: string;
    accNo: string;
    fullName: string;
    fatherName: string | null;
    cnic: string | null;
    cell: string;
    cell2: string | null;
    address: string | null;
    area: string | null;
    occupation: string | null;
    avoName: string;
    blacklisted: boolean;
    createdAt: string;
  };
  guarantors: {
    slot: number;
    fullName: string;
    fatherName: string | null;
    cnic: string | null;
    cell: string | null;
    address: string | null;
    relation: string | null;
  }[];
  agreements: LedgerAgreement[];
  receipts: LedgerReceipt[];
}

export async function getCustomerLedger(customerId: string): Promise<CustomerLedger | null> {
  const supabase = await createClient();

  const [customerRes, guarantorsRes, agreementsRes, receiptsRes] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, acc_no, full_name, father_name, cnic, cell, cell2, address, area, occupation, blacklisted, created_at, avo:profiles!customers_avo_id_fkey(full_name)"
      )
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("guarantors")
      .select("slot, full_name, father_name, cnic, cell, address, relation")
      .eq("customer_id", customerId)
      .order("slot"),
    supabase
      .from("agreements")
      .select(
        "id, agreement_no, sale_type, plan_months, total_price, advance, monthly, opened_on, status, closed_on, agreement_items(qty, unit_price, serial_no, products(name)), installments(seq, due_month, due_amount, carry_in, paid, status)"
      )
      .eq("customer_id", customerId)
      .order("opened_on", { ascending: false }),
    supabase
      .from("receipts")
      .select("id, amount, mode, collected_at, profiles(full_name)")
      .eq("customer_id", customerId)
      .order("collected_at", { ascending: false })
      .limit(20),
  ]);

  if (customerRes.error) throw new Error(customerRes.error.message);
  if (!customerRes.data) return null;
  if (guarantorsRes.error) throw new Error(guarantorsRes.error.message);
  if (agreementsRes.error) throw new Error(agreementsRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);

  type CustomerDetailRecord = {
    id: string;
    acc_no: string;
    full_name: string;
    father_name: string | null;
    cnic: string | null;
    cell: string;
    cell2: string | null;
    address: string | null;
    area: string | null;
    occupation: string | null;
    blacklisted: boolean;
    created_at: string;
    avo: { full_name: string } | null;
  };
  type AgreementRecord = {
    id: string;
    agreement_no: number;
    sale_type: string;
    plan_months: number | null;
    total_price: number;
    advance: number;
    monthly: number;
    opened_on: string;
    status: string;
    closed_on: string | null;
    agreement_items: { qty: number; unit_price: number; serial_no: string | null; products: { name: string } | null }[];
    installments: { seq: number; due_month: string; due_amount: number; carry_in: number; paid: number; status: string }[];
  };
  type ReceiptRecord = {
    id: string;
    amount: number;
    mode: string;
    collected_at: string;
    profiles: { full_name: string } | null;
  };

  const c = customerRes.data as unknown as CustomerDetailRecord;
  const agreementRecords = (agreementsRes.data ?? []) as unknown as AgreementRecord[];
  const receiptRecords = (receiptsRes.data ?? []) as unknown as ReceiptRecord[];

  const agreements: LedgerAgreement[] = agreementRecords.map((a) => {
    const installments = [...a.installments].sort((x, y) => x.seq - y.seq);
    const oldestUnpaid = installments.find((i) => i.status !== "paid");
    return {
      id: a.id,
      agreementNo: a.agreement_no,
      saleType: a.sale_type,
      planMonths: a.plan_months,
      totalPrice: a.total_price,
      advance: a.advance,
      monthly: a.monthly,
      openedOn: a.opened_on,
      status: a.status,
      closedOn: a.closed_on,
      items: a.agreement_items.map((it) => ({
        productName: it.products?.name ?? "Product",
        qty: it.qty,
        unitPrice: it.unit_price,
        serialNo: it.serial_no,
      })),
      installments: installments.map((i) => ({
        seq: i.seq,
        dueMonth: i.due_month,
        dueAmount: i.due_amount,
        carryIn: i.carry_in,
        paid: i.paid,
        status: i.status,
        owed: i.due_amount + i.carry_in - i.paid,
      })),
      collect:
        a.status === "open" && oldestUnpaid
          ? {
              id: a.id,
              label: `Agreement #${a.agreement_no}${a.plan_months ? " · " + a.plan_months + " mo" : ""}`,
              monthly: oldestUnpaid.due_amount,
              due: oldestUnpaid.due_amount + oldestUnpaid.carry_in - oldestUnpaid.paid,
            }
          : null,
    };
  });

  return {
    customer: {
      id: c.id,
      accNo: c.acc_no,
      fullName: c.full_name,
      fatherName: c.father_name,
      cnic: c.cnic,
      cell: c.cell,
      cell2: c.cell2,
      address: c.address,
      area: c.area,
      occupation: c.occupation,
      avoName: c.avo?.full_name ?? "Unassigned",
      blacklisted: c.blacklisted,
      createdAt: c.created_at,
    },
    guarantors: (guarantorsRes.data ?? []).map((g) => ({
      slot: g.slot,
      fullName: g.full_name,
      fatherName: g.father_name,
      cnic: g.cnic,
      cell: g.cell,
      address: g.address,
      relation: g.relation,
    })),
    agreements,
    receipts: receiptRecords.map((r) => ({
      id: r.id,
      amount: r.amount,
      mode: r.mode,
      collectedAt: r.collected_at,
      collectedBy: r.profiles?.full_name ?? null,
    })),
  };
}
