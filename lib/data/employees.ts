import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface EmployeeRow {
  id: string;
  fullName: string;
  role: UserRole;
  cell: string | null;
  cnic: string | null;
  salary: number;
  joinedOn: string | null;
  active: boolean;
}

export interface EmployeesData {
  rows: EmployeeRow[];
  monthlyPayroll: number;
  fieldOfficerCount: number;
  officeStaffCount: number;
  assignedAccountsCount: number;
}

export async function getEmployeesData(): Promise<EmployeesData> {
  const supabase = await createClient();

  const [employeesRes, assignedRes] = await Promise.all([
    supabase.from("employees").select("id, full_name, role, cell, cnic, salary, joined_on, active").eq("active", true).order("full_name"),
    supabase.from("customers").select("id", { count: "exact", head: true }).not("avo_id", "is", null),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (assignedRes.error) throw new Error(assignedRes.error.message);

  type EmployeeRecord = {
    id: string;
    full_name: string;
    role: UserRole;
    cell: string | null;
    cnic: string | null;
    salary: number;
    joined_on: string | null;
    active: boolean;
  };
  const rows: EmployeeRow[] = ((employeesRes.data ?? []) as EmployeeRecord[]).map((e) => ({
    id: e.id,
    fullName: e.full_name,
    role: e.role,
    cell: e.cell,
    cnic: e.cnic,
    salary: e.salary,
    joinedOn: e.joined_on,
    active: e.active,
  }));
  const monthlyPayroll = rows.reduce((t, e) => t + e.salary, 0);
  const fieldOfficerCount = rows.filter((e) => e.role === "avo").length;
  const officeStaffCount = rows.length - fieldOfficerCount;

  return {
    rows,
    monthlyPayroll,
    fieldOfficerCount,
    officeStaffCount,
    assignedAccountsCount: assignedRes.count ?? 0,
  };
}
