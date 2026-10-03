import { MapPin } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function RecoveryPage() {
  return (
    <ComingSoon
      title="AVO & recovery"
      hint="Officers, assignment, verifications"
      icon={MapPin}
      note="Officer assignment, the verification queue, and recovery performance detail live here — see the summary on the Dashboard for now."
    />
  );
}
