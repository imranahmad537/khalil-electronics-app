import { CheckCircle, AlertTriangle, Calendar, AlertCircle, type LucideIcon } from "lucide-react";
import type { CustomerStatus } from "@/lib/types";

export interface StatusMeta {
  label: string;
  edge: string;
  chipBg: string;
  chipFg: string;
  icon: LucideIcon;
}

export const STATUS_META: Record<CustomerStatus, StatusMeta> = {
  paid: { label: "Paid", edge: "var(--g500)", chipBg: "var(--g50)", chipFg: "var(--g700)", icon: CheckCircle },
  short: { label: "Short paid", edge: "var(--amber)", chipBg: "var(--amber50)", chipFg: "#8a5a10", icon: AlertTriangle },
  due: { label: "Due", edge: "#cbd2dc", chipBg: "var(--soft)", chipFg: "var(--ink2)", icon: Calendar },
  overdue: { label: "Overdue", edge: "var(--overdue)", chipBg: "var(--amber50)", chipFg: "#9a4a08", icon: AlertCircle },
  default: { label: "Defaulter", edge: "var(--red)", chipBg: "var(--red50)", chipFg: "var(--red)", icon: AlertCircle },
};
