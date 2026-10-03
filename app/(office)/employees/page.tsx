import { UserCheck } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function EmployeesPage() {
  return (
    <ComingSoon
      title="Employees"
      hint="Staff and payroll"
      icon={UserCheck}
      note="Staff records and payroll are build step 10, alongside expenses and reports."
    />
  );
}
