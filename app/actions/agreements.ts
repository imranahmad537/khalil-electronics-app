"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { matchAvoByArea } from "@/lib/avo-matching";
import { friendlyDbError } from "@/lib/db-errors";
import { isMoneyAccount, isPayMode, type MoneyAccount, type PayMode } from "@/lib/payment";
import { cellError, cnicError } from "@/lib/validation";
import { MAX_GUARANTORS } from "@/lib/guarantors";

export interface AgreementItemInput {
  productId: string;
  qty: number;
  unitPrice: number;
  serialNo: string;
}

export interface GuarantorInput {
  name: string;
  cnic: string;
  cell: string;
  relation: string;
  address: string;
}

export interface NewCustomerInput {
  fullName: string;
  fatherName: string;
  cnic: string;
  cell: string;
  cell2: string;
  area: string;
  address: string;
  occupation: string;
  avoId: string | null;
}

export interface CreateAgreementInput {
  /** Generated once per form submission and reused on retry — makes Save idempotent. */
  clientRef: string;
  mode: "new" | "existing";
  customerId: string | null;
  newCustomer: NewCustomerInput | null;
  useExistingGuarantors: boolean;
  /** Full guarantor list (1–4), ignored when useExistingGuarantors or noGuarantor. */
  guarantors: GuarantorInput[];
  noGuarantor: boolean;
  noGuarantorReason: string;
  items: AgreementItemInput[];
  plan: 12 | 10 | 0;
  advance: number;
  paymentMode: PayMode;
  paymentAccount: MoneyAccount;
}

export type CreateAgreementResult =
  | {
      ok: true;
      customerId: string;
      agreementNo: number;
      receiptId: string | null;
      avoName: string | null;
      isInstallment: boolean;
    }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Customer, guarantors, agreement, stock, schedule, signing-day receipt and
// verification are written by one create_sale() call — one transaction, so a
// failure leaves nothing behind, and a retry with the same clientRef returns
// the sale that was already saved instead of creating a second one.
export async function createNewAgreementAction(input: CreateAgreementInput): Promise<CreateAgreementResult> {
  if (!UUID.test(input.clientRef)) return { ok: false, error: "Refresh the page and try again." };
  const items = input.items.filter((i) => i.productId && i.qty > 0);
  if (items.length === 0) return { ok: false, error: "Add at least one product." };
  if (input.plan !== 12 && input.plan !== 10 && input.plan !== 0) {
    return { ok: false, error: "Choose a payment plan." };
  }
  if (!isPayMode(input.paymentMode) || !isMoneyAccount(input.paymentAccount)) {
    return { ok: false, error: "Choose how the payment was received." };
  }
  const isInstallment = input.plan !== 0;
  if (input.mode === "new" && !input.newCustomer) return { ok: false, error: "Customer details are required." };
  if (input.mode === "existing" && !input.customerId) return { ok: false, error: "Choose an existing customer." };

  const supabase = await createClient();

  let newCustomer: Record<string, string | null> | null = null;
  if (input.mode === "new" && input.newCustomer) {
    const nc = input.newCustomer;
    if (!nc.fullName.trim() || !nc.cell.trim()) {
      return { ok: false, error: "Customer name and cell number are required." };
    }
    const bad =
      fieldError("Customer CNIC", cnicError(nc.cnic, true)) ??
      fieldError("Customer cell", cellError(nc.cell, true)) ??
      fieldError("Alternate cell", cellError(nc.cell2));
    if (bad) return { ok: false, error: bad };
    let avoId = nc.avoId;
    if (!avoId && nc.area.trim()) {
      const { data: officers } = await supabase.from("profiles").select("id, zone").eq("role", "avo").eq("active", true);
      avoId = officers ? (matchAvoByArea(nc.area, officers)?.id ?? null) : null;
    }
    // no area match → create_sale falls back to the least-loaded AVO
    newCustomer = {
      full_name: nc.fullName,
      father_name: nc.fatherName,
      cnic: nc.cnic,
      cell: nc.cell,
      cell2: nc.cell2,
      address: nc.address,
      area: nc.area,
      occupation: nc.occupation,
      avo_id: avoId,
    };
  }

  const replaceGuarantors = isInstallment && !input.useExistingGuarantors;
  const waiveGuarantors = replaceGuarantors && input.noGuarantor;
  const noGuarantorReason = input.noGuarantorReason.trim();
  if (waiveGuarantors && !noGuarantorReason) {
    return { ok: false, error: "Record why this sale needs no guarantor." };
  }
  if (replaceGuarantors && !waiveGuarantors) {
    if (input.guarantors.length === 0) return { ok: false, error: "Add at least one guarantor, or mark the sale as no guarantor." };
    if (input.guarantors.length > MAX_GUARANTORS) return { ok: false, error: `At most ${MAX_GUARANTORS} guarantors.` };
    for (const [i, g] of input.guarantors.entries()) {
      const bad =
        (g.name.trim() ? null : `Guarantor ${i + 1} name: required`) ??
        fieldError(`Guarantor ${i + 1} CNIC`, cnicError(g.cnic, true)) ??
        fieldError(`Guarantor ${i + 1} cell`, cellError(g.cell, true));
      if (bad) return { ok: false, error: bad };
    }
  }

  const guarantors = replaceGuarantors
    ? waiveGuarantors
      ? []
      : input.guarantors.map((g, i) => ({ slot: i + 1, ...toGuarantorRow(g) }))
    : null;

  const { data, error } = await supabase.rpc("create_sale", {
    p_client_ref: input.clientRef,
    p_customer_id: input.mode === "existing" ? input.customerId : null,
    p_new_customer: newCustomer,
    p_guarantors: guarantors,
    p_items: items.map((i) => ({
      product_id: i.productId,
      qty: i.qty,
      unit_price: i.unitPrice,
      serial_no: i.serialNo.trim() || null,
    })),
    p_plan: isInstallment ? input.plan : null,
    p_advance: isInstallment ? input.advance : 0,
    p_mode: input.paymentMode,
    p_account: input.paymentAccount,
    p_no_guarantor_reason: waiveGuarantors ? noGuarantorReason : null,
  });

  if (error) return { ok: false, error: friendlyDbError(error, "Could not save the agreement.") };

  const result = data as {
    agreement_no: number;
    customer_id: string;
    receipt_id: string | null;
    avo_name: string | null;
  };

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/recovery");
  revalidatePath("/receipts");
  revalidatePath("/products");
  revalidatePath(`/customers/${result.customer_id}`);

  return {
    ok: true,
    customerId: result.customer_id,
    agreementNo: result.agreement_no,
    receiptId: result.receipt_id,
    avoName: result.avo_name,
    isInstallment,
  };
}

function fieldError(label: string, problem: string | null): string | null {
  return problem ? `${label}: ${problem === "Required" ? "required" : problem}` : null;
}

function toGuarantorRow(g: GuarantorInput) {
  return {
    full_name: g.name,
    cnic: g.cnic,
    cell: g.cell,
    relation: g.relation,
    address: g.address,
  };
}
