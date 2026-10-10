// Turns Postgres / PostgREST errors into something a shop user can act on.
// Messages raised on purpose by our own RPCs (0006_hardening.sql) are already
// plain language and pass through; raw constraint/permission errors don't.

interface DbError {
  code?: string;
  message: string;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  customers_cnic_key: "A customer with this CNIC already exists — use Existing customer instead.",
  customers_acc_no_key: "That account number is already taken.",
  products_stock_nonnegative: "Not enough stock for this sale.",
  guarantors_customer_id_slot_key: "This customer already has a guarantor in that slot.",
  employees_profile_id_key: "That login is already linked to another employee.",
  expenses_amount_check: "Enter an amount greater than zero.",
  vendor_payments_amount_check: "Enter an amount greater than zero.",
  purchase_items_qty_check: "Every item needs a quantity of at least 1.",
  receipts_amount_check: "Enter an amount greater than zero.",
};

export function friendlyDbError(error: DbError | null | undefined, fallback = "Something went wrong — please try again."): string {
  if (!error) return fallback;
  const msg = error.message ?? "";

  for (const [constraint, text] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (msg.includes(constraint)) return text;
  }
  if (error.code === "23505") return "This record already exists.";
  if (error.code === "23503") return "This record is linked to something that no longer exists.";
  if (error.code === "42501" && /row-level security|permission denied/i.test(msg)) {
    return "Your role doesn't have access to do this.";
  }
  if (/violates|syntax|relation .* does not exist|column .* does not exist/i.test(msg)) return fallback;
  return msg || fallback;
}
