import { Users } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function CustomersPage() {
  return (
    <ComingSoon
      title="Customers"
      hint="Monthly register"
      icon={Users}
      note="The customer register — guarantors, plan progress, and the per-customer ledger — is build step 3, right after the app shell and dashboard."
    />
  );
}
