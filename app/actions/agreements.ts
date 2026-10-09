"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { matchAvoByArea } from "@/lib/avo-matching";

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
  mode: "new" | "existing";
  customerId: string | null;
  newCustomer: NewCustomerInput | null;
  useExistingGuarantors: boolean;
  guarantor1: GuarantorInput;
  guarantor2: GuarantorInput;
  items: AgreementItemInput[];
  plan: 12 | 10 | 0;
  advance: number;
}

async function pickAvoForArea(
  supabase: Awaited<ReturnType<typeof createClient>>,
  area: string | null
): Promise<string | null> {
  const { data: officers } = await supabase.from("profiles").select("id, zone").eq("role", "avo").eq("active", true);
  if (!officers || officers.length === 0) return null;

  const match = area ? matchAvoByArea(area, officers) : null;
  if (match) return match.id;

  const { data: counts } = await supabase.from("customers").select("avo_id");
  const byOfficer = new Map(officers.map((o) => [o.id, 0]));
  for (const row of counts ?? []) {
    if (row.avo_id && byOfficer.has(row.avo_id)) byOfficer.set(row.avo_id, (byOfficer.get(row.avo_id) ?? 0) + 1);
  }
  const sorted = [...byOfficer.entries()].sort((a, b) => a[1] - b[1]);
  return sorted[0]?.[0] ?? officers[0].id;
}

export async function createNewAgreementAction(
  input: CreateAgreementInput
): Promise<
  | { ok: true; customerId: string; agreementNo: number; avoName: string | null; isInstallment: boolean }
  | { ok: false; error: string }
> {
  const items = input.items.filter((i) => i.productId && i.qty > 0);
  if (items.length === 0) return { ok: false, error: "Add at least one product." };
  if (input.plan !== 12 && input.plan !== 10 && input.plan !== 0) {
    return { ok: false, error: "Choose a payment plan." };
  }
  const isInstallment = input.plan !== 0;
  if (input.mode === "new" && !input.newCustomer) return { ok: false, error: "Customer details are required." };
  if (input.mode === "existing" && !input.customerId) return { ok: false, error: "Choose an existing customer." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let customerId = input.customerId;

  if (input.mode === "new" && input.newCustomer) {
    const nc = input.newCustomer;
    if (!nc.fullName.trim() || !nc.cell.trim()) {
      return { ok: false, error: "Customer name and cell number are required." };
    }
    const avoId = nc.avoId || (await pickAvoForArea(supabase, nc.area || null));

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        full_name: nc.fullName.trim(),
        father_name: nc.fatherName.trim() || null,
        cell: nc.cell.trim(),
        cell2: nc.cell2.trim() || null,
        cnic: nc.cnic.trim() || null,
        address: nc.address.trim() || null,
        area: nc.area.trim() || null,
        occupation: nc.occupation.trim() || null,
        avo_id: avoId,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (customerError || !customer) return { ok: false, error: customerError?.message ?? "Could not create customer." };
    customerId = customer.id;
  }

  if (!customerId) return { ok: false, error: "No customer selected." };

  if (isInstallment && !input.useExistingGuarantors) {
    const { error: gError } = await supabase.from("guarantors").upsert(
      [
        { customer_id: customerId, slot: 1, ...toGuarantorRow(input.guarantor1) },
        { customer_id: customerId, slot: 2, ...toGuarantorRow(input.guarantor2) },
      ],
      { onConflict: "customer_id,slot" }
    );
    if (gError) return { ok: false, error: gError.message };
  }

  const { data: agreementId, error: agreementError } = await supabase.rpc("create_agreement", {
    p_customer: customerId,
    p_sale: isInstallment ? "installment" : "direct",
    // p_plan / p_officer are nullable in SQL (direct sales, no officer) but the
    // generated types don't capture that — see lib/database.types.ts.
    p_plan: (isInstallment ? input.plan : null) as number,
    p_items: items.map((i) => ({
      product_id: i.productId,
      qty: i.qty,
      unit_price: i.unitPrice,
      serial_no: i.serialNo || null,
    })),
    p_advance: input.advance,
    p_officer: (user?.id ?? null) as string,
  });

  if (agreementError) return { ok: false, error: agreementError.message };

  const { data: agreement } = await supabase
    .from("agreements")
    .select("agreement_no")
    .eq("id", agreementId as string)
    .single();

  let avoName: string | null = null;
  if (isInstallment) {
    const { data: customer } = await supabase.from("customers").select("avo_id").eq("id", customerId).single();
    const avoId = customer?.avo_id ?? (await pickAvoForArea(supabase, null));
    if (avoId) {
      const { error: verificationError } = await supabase.from("verifications").insert({
        customer_id: customerId,
        avo_id: avoId,
        status: "pending",
      });
      if (verificationError) return { ok: false, error: verificationError.message };

      const { data: avoProfile } = await supabase.from("profiles").select("full_name").eq("id", avoId).single();
      avoName = avoProfile?.full_name ?? null;
    }
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/recovery");
  revalidatePath(`/customers/${customerId}`);

  return {
    ok: true,
    customerId,
    agreementNo: agreement?.agreement_no ?? 0,
    avoName,
    isInstallment,
  };
}

function toGuarantorRow(g: GuarantorInput) {
  return {
    full_name: g.name.trim(),
    cnic: g.cnic.trim() || null,
    cell: g.cell.trim() || null,
    relation: g.relation || null,
    address: g.address.trim() || null,
  };
}
