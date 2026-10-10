import { z } from "zod";

import { CELL_PATTERN, CNIC_PATTERN, cellError } from "@/lib/validation";

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
    guarantor1: guarantorSchema,
    guarantor2: guarantorSchema,

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
      for (const slot of ["guarantor1", "guarantor2"] as const) {
        const g = data[slot];
        if (!g.name.trim()) ctx.addIssue({ code: "custom", path: [slot, "name"], message: "Required" });
        if (!CNIC_PATTERN.test(g.cnic)) ctx.addIssue({ code: "custom", path: [slot, "cnic"], message: "Format: 00000-0000000-0" });
        if (!CELL_PATTERN.test(g.cell)) ctx.addIssue({ code: "custom", path: [slot, "cell"], message: "Format: 03XX-XXXXXXX" });
      }
      if (data.guarantor1.cnic && data.guarantor1.cnic === data.guarantor2.cnic) {
        ctx.addIssue({ code: "custom", path: ["guarantor2", "cnic"], message: "Same CNIC as Guarantor 1" });
      }
      if (data.mode === "new" && data.cnic && (data.cnic === data.guarantor1.cnic || data.cnic === data.guarantor2.cnic)) {
        ctx.addIssue({ code: "custom", path: ["guarantor1", "cnic"], message: "Can't match the customer's CNIC" });
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
    guarantor1: emptyGuarantor(),
    guarantor2: emptyGuarantor(),
    items: [{ productId: "", serialNo: "", qty: 1, unitPrice: 0 }],
    plan: null,
    advance: 0,
    paymentMode: "cash",
    paymentAccount: "cash_in_hand",
  };
}

