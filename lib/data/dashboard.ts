import { createClient } from "@/lib/supabase/server";
import type { CustomerMonthStatus } from "@/lib/types";
import { fetchOpenInstallments, summarizeAgreementsByCustomer } from "@/lib/data/agreements";

export interface DashboardAgreementInfo {
  id: string;
  label: string;
  monthly: number;
  due: number;
}

export interface DashboardCustomerRow extends CustomerMonthStatus {
  avoName: string;
  agreements: DashboardAgreementInfo[];
}

export interface OfficerStat {
  id: string;
  name: string;
  pct: number;
  collected: number;
  target: number;
  assigned: number;
  pending: number;
}

export interface ReceiptItem {
  id: string;
  name: string;
  meta: string;
  amount: number;
}

export interface DashboardData {
  rows: DashboardCustomerRow[];
  totalDue: number;
  collectedToday: number;
  outstanding: number;
  behindCount: number;
  defaulterCount: number;
  openAccountsCount: number;
  officers: OfficerStat[];
  receiptsToday: ReceiptItem[];
}

interface ReceiptRow {
  id: string;
  amount: number;
  mode: string;
  collected_at: string;
  collected_by: string | null;
  customers: { full_name: string } | null;
  profiles: { full_name: string } | null;
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [statusRes, officersRes, openInst, receiptsRes] = await Promise.all([
    supabase.from("customer_month_status").select("*").order("full_name"),
    supabase.from("profiles").select("id, full_name").eq("role", "avo").eq("active", true),
    fetchOpenInstallments(supabase),
    supabase
      .from("receipts")
      .select("id, amount, mode, collected_at, collected_by, customers(full_name), profiles(full_name)")
      .gte("collected_at", startOfTodayISO())
      .order("collected_at", { ascending: false }),
  ]);

  if (statusRes.error) throw new Error(statusRes.error.message);
  if (officersRes.error) throw new Error(officersRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);

  const statusRows = (statusRes.data ?? []) as CustomerMonthStatus[];
  const officerProfiles = (officersRes.data ?? []) as { id: string; full_name: string }[];
  const receiptRows = (receiptsRes.data ?? []) as unknown as ReceiptRow[];

  const officerNameById = new Map(officerProfiles.map((p) => [p.id, p.full_name]));
  const agreementSummariesByCustomer = summarizeAgreementsByCustomer(openInst);

  const agreementsByCustomer = new Map<string, DashboardAgreementInfo[]>();
  for (const [customerId, summaries] of agreementSummariesByCustomer) {
    const infos = summaries
      .filter((s) => s.oldest)
      .map((s) => ({
        id: s.id,
        label: `Agreement #${s.agreementNo}${s.planMonths ? " · " + s.planMonths + " mo" : ""}`,
        monthly: s.oldest!.monthly,
        due: s.oldest!.due,
      }));
    agreementsByCustomer.set(customerId, infos);
  }

  const rows: DashboardCustomerRow[] = statusRows.map((r) => ({
    ...r,
    avoName: r.avo_id ? officerNameById.get(r.avo_id) ?? "Unassigned" : "Unassigned",
    agreements: agreementsByCustomer.get(r.customer_id) ?? [],
  }));

  const totalDue = rows.reduce((t, r) => t + Math.max(0, r.due_now ?? 0), 0);
  const collectedToday = receiptRows.reduce((t, r) => t + r.amount, 0);
  const outstanding = Math.max(0, totalDue - collectedToday);
  const behindCount = rows.filter((r) => r.status === "overdue" || r.status === "default").length;
  const defaulterCount = rows.filter((r) => r.status === "default").length;
  const openAccountsCount = rows.filter((r) => (r.due_now ?? 0) > 0).length;

  const officers: OfficerStat[] = officerProfiles.map((o) => {
    const mine = rows.filter((r) => r.avo_id === o.id);
    const target = mine.reduce((t, r) => t + Math.max(0, r.due_now ?? 0), 0);
    const collected = receiptRows.filter((r) => r.collected_by === o.id).reduce((t, r) => t + r.amount, 0);
    const pct = target ? Math.min(100, Math.round((collected / target) * 100)) : 0;
    return {
      id: o.id,
      name: o.full_name,
      pct,
      collected,
      target,
      assigned: mine.length,
      pending: mine.filter((r) => (r.due_now ?? 0) > 0).length,
    };
  });

  const receiptsToday: ReceiptItem[] = receiptRows.slice(0, 6).map((r) => ({
    id: r.id,
    name: r.customers?.full_name ?? "Customer",
    meta: `${r.profiles?.full_name ?? "—"} · ${r.mode} · ${new Date(r.collected_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    amount: r.amount,
  }));

  return {
    rows,
    totalDue,
    collectedToday,
    outstanding,
    behindCount,
    defaulterCount,
    openAccountsCount,
    officers,
    receiptsToday,
  };
}
