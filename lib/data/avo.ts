import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { shopMonthStartISO } from "@/lib/shop-time";
import type { CustomerMonthStatus } from "@/lib/types";
import { fetchOpenInstallments, summarizeAgreementsByCustomer } from "@/lib/data/agreements";
import type { CollectAgreement } from "@/components/collect-dialog";

export interface AvoCustomerCard {
  customerId: string;
  fullName: string;
  cell: string;
  accNo: string;
  area: string | null;
  status: CustomerMonthStatus["status"];
  dueNow: number;
  remaining: number;
  agreements: CollectAgreement[];
}

export interface AvoData {
  officerId: string;
  officerName: string;
  customers: AvoCustomerCard[];
  collectedThisMonth: number;
  outstanding: number;
}


export async function getAvoData(): Promise<AvoData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, statusRes, openInst, receiptsRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    // RLS (avo_read) already scopes this to the officer's own customers.
    fetchAll((a, b) => supabase.from("customer_month_status").select("*").order("full_name").order("customer_id").range(a, b)),
    fetchOpenInstallments(supabase),
    fetchAll((a, b) => supabase.from("receipts").select("amount").eq("collected_by", user.id).gte("collected_at", shopMonthStartISO()).order("id").range(a, b)),
  ]);

  if (statusRes.error) throw new Error(statusRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);

  const statusRows = (statusRes.data ?? []) as CustomerMonthStatus[];
  const agreementsByCustomer = summarizeAgreementsByCustomer(openInst);

  const customers: AvoCustomerCard[] = statusRows.map((r) => ({
    customerId: r.customer_id,
    fullName: r.full_name,
    cell: r.cell,
    accNo: r.acc_no,
    area: r.area,
    status: r.status,
    dueNow: Math.max(0, r.due_now ?? 0),
    remaining: Math.max(0, r.remaining ?? 0),
    agreements: (agreementsByCustomer.get(r.customer_id) ?? [])
      .filter((a) => a.oldest)
      .map((a) => ({
        id: a.id,
        label: `Agreement #${a.agreementNo}${a.planMonths ? " · " + a.planMonths + " mo" : ""}`,
        monthly: a.oldest!.monthly,
        due: a.oldest!.due,
      })),
  }));

  const collectedThisMonth = ((receiptsRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const outstanding = customers.reduce((t, c) => t + c.dueNow, 0);

  return {
    officerId: user.id,
    officerName: profileRes.data?.full_name ?? "Officer",
    customers,
    collectedThisMonth,
    outstanding,
  };
}

export interface AvoVerification {
  id: string;
  customerId: string;
  customerName: string;
  accNo: string;
  area: string | null;
  houseType: string | null;
  notes: string | null;
  photoCount: number;
}

export async function getAvoVerifications(): Promise<AvoVerification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verifications")
    .select("id, customer_id, house_type, notes, photo_paths, customers(full_name, acc_no, area)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    customer_id: string;
    house_type: string | null;
    notes: string | null;
    photo_paths: string[] | null;
    customers: { full_name: string; acc_no: string; area: string | null } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((v) => ({
    id: v.id,
    customerId: v.customer_id,
    customerName: v.customers?.full_name ?? "Customer",
    accNo: v.customers?.acc_no ?? "—",
    area: v.customers?.area ?? null,
    houseType: v.house_type,
    notes: v.notes,
    photoCount: v.photo_paths?.length ?? 0,
  }));
}
