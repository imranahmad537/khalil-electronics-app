import { z } from "zod";

import { CELL_PATTERN, CNIC_PATTERN, cellError } from "@/lib/validation";
import { MAX_GUARANTORS } from "@/lib/guarantors";

// Formats live in lib/validation.ts so every form validates the same way.
export { CNIC_PATTERN, CELL_PATTERN, maskCnic, maskCell } from "@/lib/validation";

export const RELATIONS = ["Brother", "Father", "Friend", "Colleague", "Neighbour", "Other"] as const;

const guarantorSchema = z.object({
  name: z.string(),
  cnic: z.string(),
  cell: z.string(),
  relation: z.string(),
  address: z.string(),
});

const itemSchema = z.object({
  productId: z.string(),
  serialNo: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
});

export const agreementFormSchema = z
  .object({
    mode: z.enum(["new", "existing"]),
    customerId: z.string().nullable(),

    fullName: z.string(),
    fatherName: z.string(),
    cnic: z.string(),
    cell: z.string(),
    cell2: z.string(),
    area: z.string(),
    address: z.string(),
    occupation: z.string(),
    avoId: z.string().nullable(),

    useExistingGuarantors: z.boolean(),
    guarantors: z.array(guarantorSchema).max(MAX_GUARANTORS, `At most ${MAX_GUARANTORS} guarantors`),
    /** Installment without any guarantor (e.g. a relative) — needs noGuarantorReason. */
    noGuarantor: z.boolean(),
    noGuarantorReason: z.string(),

    items: z.array(itemSchema),

    plan: z.union([z.literal(12), z.literal(10), z.literal(0)]).nullable(),
    advance: z.number().min(0, "Can't be negative"),
    paymentMode: z.enum(["cash", "bank", "jazzcash", "easypaisa"]),
    paymentAccount: z.enum(["cash_in_hand", "meezan_bank", "jazzcash"]),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "new") {
      if (!data.fullName.trim()) ctx.addIssue({ code: "custom", path: ["fullName"], message: "Required" });
      if (!CNIC_PATTERN.test(data.cnic)) ctx.addIssue({ code: "custom", path: ["cnic"], message: "Format: 00000-0000000-0" });
      if (!CELL_PATTERN.test(data.cell)) ctx.addIssue({ code: "custom", path: ["cell"], message: "Format: 03XX-XXXXXXX" });
      const cell2 = cellError(data.cell2);
      if (cell2) ctx.addIssue({ code: "custom", path: ["cell2"], message: cell2 });
      if (!data.address.trim()) ctx.addIssue({ code: "custom", path: ["address"], message: "Required" });
    } else {
      if (!data.customerId) ctx.addIssue({ code: "custom", path: ["customerId"], message: "Pick a customer" });
    }

    const validItems = data.items.filter((i) => i.productId && i.qty > 0);
    if (validItems.length === 0) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "Add at least one product" });
    }

    if (data.plan === null) {
      ctx.addIssue({ code: "custom", path: ["plan"], message: "Choose a plan" });
    }

    const isInstallment = data.plan === 12 || data.plan === 10;
    if (isInstallment) {
      const total = validItems.reduce((t, i) => t + i.qty * i.unitPrice, 0);
      if (total > 0 && data.advance >= total) {
        ctx.addIssue({ code: "custom", path: ["advance"], message: "Advance covers the whole price — use Direct sale" });
      }
    }
    if (isInstallment && !data.useExistingGuarantors) {
      if (data.noGuarantor) {
        if (!data.noGuarantorReason.trim()) {
          ctx.addIssue({ code: "custom", path: ["noGuarantorReason"], message: "Say why no guarantor is needed" });
        }
      } else {
        if (data.guarantors.length === 0) {
          ctx.addIssue({ code: "custom", path: ["guarantors"], message: "Add a guarantor, or mark this sale as no guarantor" });
        }
        const seen = new Map<string, number>();
        data.guarantors.forEach((g, i) => {
          if (!g.name.trim()) ctx.addIssue({ code: "custom", path: ["guarantors", i, "name"], message: "Required" });
          if (!CNIC_PATTERN.test(g.cnic)) ctx.addIssue({ code: "custom", path: ["guarantors", i, "cnic"], message: "Format: 00000-0000000-0" });
          if (!CELL_PATTERN.test(g.cell)) ctx.addIssue({ code: "custom", path: ["guarantors", i, "cell"], message: "Format: 03XX-XXXXXXX" });
          if (g.cnic) {
            const first = seen.get(g.cnic);
            if (first !== undefined) {
              ctx.addIssue({ code: "custom", path: ["guarantors", i, "cnic"], message: `Same CNIC as Guarantor ${first + 1}` });
            } else {
              seen.set(g.cnic, i);
            }
            if (data.mode === "new" && data.cnic && g.cnic === data.cnic) {
              ctx.addIssue({ code: "custom", path: ["guarantors", i, "cnic"], message: "Can't match the customer's CNIC" });
            }
          }
        });
      }
    }
  });

export type AgreementFormValues = z.infer<typeof agreementFormSchema>;

export function emptyGuarantor() {
  return { name: "", cnic: "", cell: "", relation: RELATIONS[0], address: "" };
}

export function defaultAgreementValues(): AgreementFormValues {
  return {
    mode: "new",
    customerId: null,
    fullName: "",
    fatherName: "",
    cnic: "",
    cell: "",
    cell2: "",
    area: "",
    address: "",
    occupation: "",
    avoId: null,
    useExistingGuarantors: false,
    guarantors: [emptyGuarantor()],
    noGuarantor: false,
    noGuarantorReason: "",
    items: [{ productId: "", serialNo: "", qty: 1, unitPrice: 0 }],
    plan: null,
    advance: 0,
    paymentMode: "cash",
    paymentAccount: "cash_in_hand",
  };
}

