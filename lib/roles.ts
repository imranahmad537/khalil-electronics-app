import type { UserRole } from "@/lib/types";

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner / Admin",
  manager: "Shop manager",
  accountant: "Accountant",
  sales: "Sales officer",
  avo: "AVO",
};

export const ASSIGNABLE_ROLES: UserRole[] = ["avo", "sales", "accountant", "manager", "owner"];
