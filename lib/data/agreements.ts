import { fetchAll } from "@/lib/supabase/fetch-all";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shopMonthStartStr } from "@/lib/shop-time";

// Shared across the dashboard's Collect dialog and the Customers register's Plan
// column: both need the same "which installment is still open on each agreement"
// view that post_receipt() itself uses (it always targets the oldest row with
// status <> 'paid' — see supabase/migrations/0002_billing.sql).

export interface OpenInstallmentRow {
  agreement_id: string;
  seq: number;
  due_month: string;
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
  /**
   * monthly: the oldest open installment's amount.
   * due: everything owed up to and including this month (arrears + current) —
   * matches due_now on the dashboard. If nothing is due yet (paying ahead),
   * the next upcoming installment.
   */
  oldest: { monthly: number; due: number } | null;
}

export async function fetchOpenInstallments(supabase: SupabaseClient): Promise<OpenInstallmentRow[]> {
  const { data, error } = await fetchAll((a, b) =>
      supabase
    .from("installments")
    .select(
      "agreement_id, seq, due_month, due_amount, carry_in, paid, status, agreements!inner(id, customer_id, agreement_no, plan_months, total_price, monthly, status)"
    )
    .eq("agreements.status", "open")
    .order("seq", { ascending: true })
        .order("id")
        .range(a, b)
    );

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

  const thisMonth = shopMonthStartStr();
  const owed = (r: OpenInstallmentRow) => Number(r.due_amount) + Number(r.carry_in) - Number(r.paid);
  const byCustomer = new Map<string, AgreementSummary[]>();
  for (const instRows of byAgreement.values()) {
    const ag = instRows[0]?.agreements;
    if (!ag) continue;

    const paidCount = instRows.filter((r) => r.status === "paid").length;
    const unpaid = instRows.filter((r) => r.status !== "paid").sort((a, b) => a.seq - b.seq);
    const oldestUnpaid = unpaid[0];
    const dueNow = unpaid.filter((r) => r.due_month <= thisMonth).reduce((t, r) => t + owed(r), 0);

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
            due: Math.max(0, dueNow > 0 ? dueNow : owed(oldestUnpaid)),
          }
        : null,
    };

    const list = byCustomer.get(ag.customer_id) ?? [];
    list.push(summary);
    byCustomer.set(ag.customer_id, list);
  }

  return byCustomer;
}
