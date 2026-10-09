import { createClient } from "@/lib/supabase/server";
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
}

export interface RecoveryData {
  officers: OfficerPerformanceRow[];
  verifications: PendingVerification[];
  recoveredToday: number;
  assignedAccountsCount: number;
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getRecoveryData(): Promise<RecoveryData> {
  const supabase = await createClient();

  const [officersRes, statusRes, receiptsRes, verificationsRes, assignedCountRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, zone").eq("role", "avo").eq("active", true).order("full_name"),
    supabase.from("customer_month_status").select("*"),
    supabase.from("receipts").select("amount, collected_by").gte("collected_at", startOfTodayISO()),
    supabase
      .from("verifications")
      .select("id, customer_id, house_type, notes, photo_paths, created_at, customers(full_name, acc_no), profiles(full_name)")
      .eq("status", "pending")
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
  avoName: string;
}

export async function getAssignableCustomers(): Promise<AssignableCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, acc_no, avo:profiles!customers_avo_id_fkey(full_name)")
    .order("full_name");
  if (error) throw new Error(error.message);

  type Row = { id: string; full_name: string; acc_no: string; avo: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    accNo: c.acc_no,
    avoName: c.avo?.full_name ?? "Unassigned",
  }));
}
