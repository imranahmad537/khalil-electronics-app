import {
  LayoutGrid,
  Users,
  FileText,
  Receipt,
  MapPin,
  Box,
  Truck,
  Wallet,
  UserCheck,
  BarChart3,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** which Permissions flag must be true to show this item; omit if everyone (every office role) sees it */
  requires?: "canManageEmployees" | "canManageFinance" | "canManageLogins";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "MENU",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { key: "customers", label: "Customers", href: "/customers", icon: Users },
      { key: "agreements", label: "New agreement", href: "/agreements/new", icon: FileText },
      { key: "receipts", label: "Receipts", href: "/receipts", icon: Receipt },
      { key: "recovery", label: "AVO & recovery", href: "/recovery", icon: MapPin },
    ],
  },
  {
    label: "GENERAL",
    items: [
      { key: "products", label: "Products", href: "/products", icon: Box },
      { key: "vendors", label: "Vendors & bills", href: "/vendors", icon: Truck, requires: "canManageFinance" },
      { key: "expenses", label: "Expenses", href: "/expenses", icon: Wallet, requires: "canManageFinance" },
      { key: "employees", label: "Employees", href: "/employees", icon: UserCheck, requires: "canManageEmployees" },
      { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
      { key: "logins", label: "Users & logins", href: "/logins", icon: KeyRound, requires: "canManageLogins" },
    ],
  },
];
