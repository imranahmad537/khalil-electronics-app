import { Box } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ProductsPage() {
  return (
    <ComingSoon
      title="Products"
      hint="Catalogue and stock"
      icon={Box}
      note="Product catalogue, cost/price, and stock levels come with vendors and purchases."
    />
  );
}
