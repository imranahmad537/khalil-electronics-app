import { createClient } from "@/lib/supabase/server";

export interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  account: string;
  spentOn: string;
}

export interface ExpensesData {
  rows: ExpenseRow[];
  spentThisMonth: number;
  fixedCosts: number;
  fieldAndSalaries: number;
  cashPositionToday: number;
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getExpensesData(): Promise<ExpensesData> {
  const supabase = await createClient();
  const monthStart = startOfMonthISO();

  const [expensesRes, receiptsTodayRes, expensesTodayRes] = await Promise.all([
    supabase.from("expenses").select("id, category, description, amount, account, spent_on").gte("spent_on", monthStart).order("spent_on", { ascending: false }),
    supabase.from("receipts").select("amount").gte("collected_at", startOfTodayISO()),
    supabase.from("expenses").select("amount").gte("spent_on", new Date().toISOString().slice(0, 10)),
  ]);

  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (receiptsTodayRes.error) throw new Error(receiptsTodayRes.error.message);
  if (expensesTodayRes.error) throw new Error(expensesTodayRes.error.message);

  type ExpenseRecord = {
    id: string;
    category: string;
    description: string | null;
    amount: number;
    account: string;
    spent_on: string;
  };
  const rows: ExpenseRow[] = ((expensesRes.data ?? []) as ExpenseRecord[]).map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: e.amount,
    account: e.account,
    spentOn: e.spent_on,
  }));
  const spentThisMonth = rows.reduce((t, e) => t + e.amount, 0);
  const fixedCosts = rows.filter((e) => ["Shop rent", "Utilities"].includes(e.category)).reduce((t, e) => t + e.amount, 0);
  const fieldAndSalaries = rows.filter((e) => ["Salaries", "Fuel"].includes(e.category)).reduce((t, e) => t + e.amount, 0);

  const collectedToday = ((receiptsTodayRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);
  const spentToday = ((expensesTodayRes.data ?? []) as { amount: number }[]).reduce((t, r) => t + r.amount, 0);

  return {
    rows,
    spentThisMonth,
    fixedCosts,
    fieldAndSalaries,
    cashPositionToday: collectedToday - spentToday,
  };
}
