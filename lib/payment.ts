import type { Database } from "@/lib/database.types";

export type PayMode = Database["public"]["Enums"]["pay_mode"];
export type MoneyAccount = Database["public"]["Enums"]["money_account"];

export const PAY_MODES: { value: PayMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
];

export const MONEY_ACCOUNTS: { value: MoneyAccount; label: string }[] = [
  { value: "cash_in_hand", label: "Cash in hand" },
  { value: "meezan_bank", label: "Meezan Bank" },
  { value: "jazzcash", label: "JazzCash" },
];

// Where money paid in each mode normally lands. Easypaisa has no account of
// its own, so it defaults to the bank — the picker lets staff change it.
const DEFAULT_ACCOUNT: Record<PayMode, MoneyAccount> = {
  cash: "cash_in_hand",
  bank: "meezan_bank",
  jazzcash: "jazzcash",
  easypaisa: "meezan_bank",
};

export function defaultAccountFor(mode: PayMode): MoneyAccount {
  return DEFAULT_ACCOUNT[mode];
}

export function isPayMode(v: unknown): v is PayMode {
  return PAY_MODES.some((m) => m.value === v);
}

export function isMoneyAccount(v: unknown): v is MoneyAccount {
  return MONEY_ACCOUNTS.some((a) => a.value === v);
}
