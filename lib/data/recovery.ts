import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { shopTodayStartISO } from "@/lib/shop-time";
import type { CustomerMonthStatus } from "@/lib/types";

export interface OfficerPerformanceRow {
  id: string;
  name: string;
  zone: string | null;
  accountCount: number;
  pendingCount: number;
  target: number;
  collected: number;
}

export interface PendingVerification {
  id: string;
  customerId: string;
  customerName: string;
  accNo: string;
  avoName: string;
  houseType: string | null;
  notes: string | null;
  photoCount: number;
  createdAt: string;
  /** pending = awaiting the AVO's visit; approved = opened by the AVO recently (office can still reject). */
  status: "pending" | "approved";
}

export interface RecoveryData {
  officers: OfficerPerformanceRow[];
  verifications: PendingVerification[];
  recoveredToday: number;
  assignedAccountsCount: number;
}

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getRecoveryData(): Promise<RecoveryData> {
  const supabase = await createClient();

  const [officersRes, statusRes, receiptsRes, verificationsRes, assignedCountRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, zone").eq("role", "avo").eq("active", true).order("full_name"),
    fetchAll((a, b) => supabase.from("customer_month_status").select("*").order("customer_id").range(a, b)),
    supabase.from("receipts").select("amount, collected_by").gte("collected_at", shopTodayStartISO()),
    supabase
      .from("verifications")
      .select("id, customer_id, status, house_type, notes, photo_paths, created_at, customers(full_name, acc_no), profiles(full_name)")
      .or(`status.eq.pending,and(status.eq.approved,visited_at.gte."${daysAgoISO(14)}")`)
      .order("created_at", { ascending: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }).not("avo_id", "is", null),
  ]);

  if (officersRes.error) throw new Error(officersRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);
  if (receiptsRes.error) throw new Error(receiptsRes.error.message);
  if (verificationsRes.error) throw new Error(verificationsRes.error.message);
  if (assignedCountRes.error) throw new Error(assignedCountRes.error.message);

  type OfficerRecord = { id: string; full_name: string; zone: string | null };
  type ReceiptRecord = { amount: number; collected_by: string | null };
  type VerificationRecord = {
    id: string;
    customer_id: string;
    status: "pending" | "approved";
    house_type: string | null;
    notes: string | null;
    photo_paths: string[] | null;
    created_at: string;
    customers: { full_name: string; acc_no: string } | null;
    profiles: { full_name: string } | null;
  };

  const officers = (officersRes.data ?? []) as OfficerRecord[];
  const statusRows = (statusRes.data ?? []) as CustomerMonthStatus[];
  const receipts = (receiptsRes.data ?? []) as ReceiptRecord[];
  const verificationRecords = (verificationsRes.data ?? []) as unknown as VerificationRecord[];

  const officerRows: OfficerPerformanceRow[] = officers.map((o) => {
    const mine = statusRows.filter((r) => r.avo_id === o.id);
    const target = mine.reduce((t, r) => t + Math.max(0, r.due_now ?? 0), 0);
    const collected = receipts.filter((r) => r.collected_by === o.id).reduce((t, r) => t + r.amount, 0);
    return {
      id: o.id,
      name: o.full_name,
      zone: o.zone,
      accountCount: mine.length,
      pendingCount: mine.filter((r) => (r.due_now ?? 0) > 0).length,
      target,
      collected,
    };
  });

  const verifications: PendingVerification[] = verificationRecords.map((v) => ({
    id: v.id,
    customerId: v.customer_id,
    customerName: v.customers?.full_name ?? "Customer",
    accNo: v.customers?.acc_no ?? "—",
    avoName: v.profiles?.full_name ?? "Unassigned",
    houseType: v.house_type,
    notes: v.notes,
    photoCount: v.photo_paths?.length ?? 0,
    createdAt: v.created_at,
    status: v.status,
  }));

  return {
    officers: officerRows,
    verifications,
    recoveredToday: receipts.reduce((t, r) => t + r.amount, 0),
    assignedAccountsCount: assignedCountRes.count ?? 0,
  };
}

export interface AssignableCustomer {
  id: string;
  fullName: string;
  accNo: string;
  area: string | null;
  avoId: string | null;
  avoName: string;
  /** false when the customer's officer has been deactivated — nobody is collecting */
  avoActive: boolean;
}

export async function getAssignableCustomers(): Promise<AssignableCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await fetchAll((a, b) =>
      supabase
    .from("customers")
    .select("id, full_name, acc_no, area, avo_id, avo:profiles!customers_avo_id_fkey(full_name, active)")
    .order("full_name")
        .order("id")
        .range(a, b)
    );
  if (error) throw new Error(error.message);

  type Row = { id: string; full_name: string; acc_no: string; area: string | null; avo_id: string | null; avo: { full_name: string; active: boolean } | null };
  return ((data ?? []) as unknown as Row[]).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    accNo: c.acc_no,
    area: c.area,
    avoId: c.avo_id,
    avoName: c.avo?.full_name ?? "Unassigned",
    avoActive: !!c.avo?.active,
  }));
}
