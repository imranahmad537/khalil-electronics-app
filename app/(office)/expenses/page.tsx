import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ExpensesPage() {
  return (
    <ComingSoon
      title="Expenses"
      hint="Shop expenses"
      icon={Wallet}
      note="Expense tracking by category and account is build step 10, alongside employees and reports."
    />
  );
}
