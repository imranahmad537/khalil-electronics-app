import { CheckCircle, Calendar, MapPin, AlertTriangle, BookOpen, Truck, Box, TrendingUp, Users, type LucideIcon } from "lucide-react";

export interface ReportDef {
  key: string;
  group: string;
  name: string;
  note: string;
  icon: LucideIcon;
  tone: "good" | "plain" | "warn";
  /** which Permissions flag must be true to see/open this report; omit if every office role can */
  requires?: "canManageFinance";
}

export const REPORTS: ReportDef[] = [
  {
    key: "installments-received",
    group: "Recovery",
    name: "Installments received",
    note: "Month-wise receipts by customer, officer and account.",
    icon: CheckCircle,
    tone: "good",
  },
  {
    key: "installments-receivable",
    group: "Recovery",
    name: "Installments receivable",
    note: "Open dues per agreement with guarantor contacts.",
    icon: Calendar,
    tone: "plain",
  },
  {
    key: "daily-recovery-sheet",
    group: "Recovery",
    name: "Daily recovery sheet",
    note: "Officer-wise print sheet for the field round.",
    icon: MapPin,
    tone: "plain",
  },
  {
    key: "defaulter-list",
    group: "Recovery",
    name: "Defaulter list",
    note: "Two or more missed installments, with guarantor contacts.",
    icon: AlertTriangle,
    tone: "warn",
  },
  {
    key: "customer-ledger",
    group: "Ledgers",
    name: "Customer ledger",
    note: "Every invoice, receipt and carry-forward per account.",
    icon: BookOpen,
    tone: "plain",
  },
  {
    key: "customer-list",
    group: "Ledgers",
    name: "Customer list",
    note: "All customers with guarantors, plan, advance and balance — printable.",
    icon: Users,
    tone: "plain",
  },
  {
    key: "account-payables",
    group: "Ledgers",
    name: "Account payables",
    note: "Vendor balances and bill history.",
    icon: Truck,
    tone: "plain",
    requires: "canManageFinance",
  },
  {
    key: "inventory-reorder",
    group: "Stock",
    name: "Inventory & reorder",
    note: "Stock on hand, value at cost, below-minimum list.",
    icon: Box,
    tone: "plain",
  },
  {
    key: "profit-loss",
    group: "Accounts",
    name: "Profit & loss",
    note: "Sales, recovery, expenses and margin for the month.",
    icon: TrendingUp,
    tone: "good",
    requires: "canManageFinance",
  },
];
