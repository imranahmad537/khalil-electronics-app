import { Truck } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function VendorsPage() {
  return (
    <ComingSoon
      title="Vendors & bills"
      hint="Purchases and payables"
      icon={Truck}
      note="Vendor bills, purchases, and payments are build step 4."
    />
  );
}
