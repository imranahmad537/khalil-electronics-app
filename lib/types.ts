// Hand-authored domain types for the shapes this app actually reads/writes.
// supabase-js's generated `Database` generic fights its own inference for embedded
// selects and rpc() once the schema is only partially modelled, so for now the
// Supabase clients (lib/supabase/{server,client}.ts) are untyped and callers cast
// query results to these interfaces instead. Once `npx supabase gen types typescript
// --local` has a stable output, swap these for the generated file and re-type the
// clients with the full `Database` generic.

export type UserRole = "owner" | "sales" | "avo" | "accountant" | "manager";
export type AgreementState = "pending_verification" | "open" | "closed" | "cancelled";
export type InstState = "upcoming" | "due" | "short" | "paid" | "overdue" | "default";
export type PayMode = "cash" | "bank" | "jazzcash" | "easypaisa";
export type MoneyAccount = "cash_in_hand" | "meezan_bank" | "jazzcash";
export type VerifyState = "pending" | "approved" | "rejected";
export type CustomerStatus = "paid" | "short" | "due" | "overdue" | "default";

export interface CustomerMonthStatus {
  customer_id: string;
  acc_no: string;
  full_name: string;
  cell: string;
  cnic: string | null;
  area: string | null;
  avo_id: string | null;
  g1_name: string | null;
  g1_cell: string | null;
  g1_cnic: string | null;
  g2_name: string | null;
  g2_cell: string | null;
  g2_cnic: string | null;
  monthly_total: number | null;
  due_now: number | null;
  remaining: number | null;
  carry: number | null;
  months_behind: number | null;
  status: CustomerStatus;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  cell: string | null;
  zone: string | null;
  active: boolean;
  created_at: string;
}

export interface Receipt {
  id: string;
  receipt_no: number;
  agreement_id: string;
  installment_id: string | null;
  customer_id: string;
  amount: number;
  mode: PayMode;
  account: MoneyAccount;
  collected_by: string | null;
  collected_at: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
}
