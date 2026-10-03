import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      hint="8 reports"
      icon={BarChart3}
      note="Installments received/receivable, the daily recovery sheet, defaulter list, ledgers, payables, inventory and profit & loss — build step 10."
    />
  );
}
