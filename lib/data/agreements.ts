import type { SupabaseClient } from "@supabase/supabase-js";

// Shared across the dashboard's Collect dialog and the Customers register's Plan
// column: both need the same "which installment is still open on each agreement"
// view that post_receipt() itself uses (it always targets the oldest row with
// status <> 'paid' — see supabase/migrations/0002_billing.sql).

export interface OpenInstallmentRow {
  agreement_id: string;
  seq: number;
  due_amount: number;
  carry_in: number;
  paid: number;
  status: string;
  agreements: {
    id: string;
    customer_id: string;
    agreement_no: number;
    plan_months: number | null;
    total_price: number;
    monthly: number;
  } | null;
}

export interface AgreementSummary {
  id: string;
  agreementNo: number;
  planMonths: number | null;
  totalPrice: number;
  monthly: number;
  paidCount: number;
  totalCount: number;
  /** the installment post_receipt() will apply the next payment to, if any remain */
  oldest: { monthly: number; due: number } | null;
}

export async function fetchOpenInstallments(supabase: SupabaseClient): Promise<OpenInstallmentRow[]> {
  const { data, error } = await supabase
    .from("installments")
    .select(
      "agreement_id, seq, due_amount, carry_in, paid, status, agreements!inner(id, customer_id, agreement_no, plan_months, total_price, monthly, status)"
    )
    .eq("agreements.status", "open")
    .order("seq", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OpenInstallmentRow[];
}

export function summarizeAgreementsByCustomer(rows: OpenInstallmentRow[]): Map<string, AgreementSummary[]> {
  const byAgreement = new Map<string, OpenInstallmentRow[]>();
  for (const r of rows) {
    const list = byAgreement.get(r.agreement_id) ?? [];
    list.push(r);
    byAgreement.set(r.agreement_id, list);
  }

  const byCustomer = new Map<string, AgreementSummary[]>();
  for (const instRows of byAgreement.values()) {
    const ag = instRows[0]?.agreements;
    if (!ag) continue;

    const paidCount = instRows.filter((r) => r.status === "paid").length;
    const oldestUnpaid = instRows
      .filter((r) => r.status !== "paid")
      .sort((a, b) => a.seq - b.seq)[0];

    const summary: AgreementSummary = {
      id: ag.id,
      agreementNo: ag.agreement_no,
      planMonths: ag.plan_months,
      totalPrice: ag.total_price,
      monthly: ag.monthly,
      paidCount,
      totalCount: ag.plan_months ?? instRows.length,
      oldest: oldestUnpaid
        ? {
            monthly: oldestUnpaid.due_amount,
            due: oldestUnpaid.due_amount + oldestUnpaid.carry_in - oldestUnpaid.paid,
          }
        : null,
    };

    const list = byCustomer.get(ag.customer_id) ?? [];
    list.push(summary);
    byCustomer.set(ag.customer_id, list);
  }

  return byCustomer;
}
