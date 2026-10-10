import { createClient } from "@/lib/supabase/server";
import { shopMonthStartStr, shopTodayStartISO, shopTodayStr } from "@/lib/shop-time";

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


export async function getExpensesData(): Promise<ExpensesData> {
  const supabase = await createClient();
  const monthStart = shopMonthStartStr();

  const [expensesRes, receiptsTodayRes, expensesTodayRes] = await Promise.all([
    supabase.from("expenses").select("id, category, description, amount, account, spent_on").gte("spent_on", monthStart).order("spent_on", { ascending: false }),
    supabase.from("receipts").select("amount").gte("collected_at", shopTodayStartISO()),
    supabase.from("expenses").select("amount").gte("spent_on", shopTodayStr()),
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
