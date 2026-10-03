import { Receipt } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ReceiptsPage() {
  return (
    <ComingSoon
      title="Receipts"
      hint="All collections"
      icon={Receipt}
      note="A full receipts register — every post_receipt call, searchable and exportable — comes after agreements and the collect flow."
    />
  );
}
