import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function NewAgreementPage() {
  return (
    <ComingSoon
      title="New agreement"
      hint="Customer, guarantors, products"
      icon={FileText}
      note="Creating agreements via create_agreement, with the live installment summary bar, comes right after the customer register."
    />
  );
}
