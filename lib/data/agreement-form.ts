import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { CustomerMonthStatus, CustomerStatus } from "@/lib/types";
import { fetchOpenInstallments, summarizeAgreementsByCustomer } from "@/lib/data/agreements";
import { toGuarantorBriefs, type GuarantorBrief } from "@/lib/guarantors";

export interface ExistingCustomerOption {
  id: string;
  fullName: string;
  accNo: string;
  cell: string;
  cnic: string | null;
  address: string | null;
  area: string | null;
  avoId: string | null;
  guarantors: GuarantorBrief[];
  noGuarantorReason: string | null;
  status: CustomerStatus;
  openAgreementsCount: number;
  monthlyDue: number;
  remaining: number;
}

export interface ProductOption {
  id: string;
  name: string;
  categoryName: string | null;
  price: number;
  stock: number;
}

export interface OfficerOption {
  id: string;
  fullName: string;
  zone: string | null;
}

export interface AgreementFormData {
  customers: ExistingCustomerOption[];
  products: ProductOption[];
  officers: OfficerOption[];
  areas: string[];
}

const NO_ACTIVE_PLAN: CustomerStatus = "paid";

export async function getAgreementFormData(): Promise<AgreementFormData> {
  const supabase = await createClient();

  const [customersRes, statusRes, productsRes, officersRes, openInst] = await Promise.all([
    fetchAll((a, b) =>
      supabase
      .from("customers")
      .select("id, full_name, acc_no, cell, cnic, address, area, avo_id, no_guarantor_reason, guarantors(slot, full_name, cnic, cell)")
      .order("full_name")
        .order("id")
        .range(a, b)
    ),
    fetchAll((a, b) => supabase.from("customer_month_status").select("*").order("customer_id").range(a, b)),
    fetchAll((a, b) => supabase.from("products").select("id, name, price, stock, categories(name)").order("name").order("id").range(a, b)),
    supabase.from("profiles").select("id, full_name, zone").eq("role", "avo").eq("active", true).order("full_name"),
    fetchOpenInstallments(supabase),
  ]);

  if (customersRes.error) throw new Error(customersRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (officersRes.error) throw new Error(officersRes.error.message);

  type CustomerRecord = {
    id: string;
    full_name: string;
    acc_no: string;
    cell: string;
    cnic: string | null;
    address: string | null;
    area: string | null;
    avo_id: string | null;
    no_guarantor_reason: string | null;
    guarantors: { slot: number; full_name: string; cnic: string | null; cell: string | null }[];
  };
  type ProductRecord = {
    id: string;
    name: string;
    price: number;
    stock: number;
    categories: { name: string } | null;
  };

  const customerRecords = (customersRes.data ?? []) as unknown as CustomerRecord[];
  const statusByCustomer = new Map((statusRes.data as CustomerMonthStatus[]).map((r) => [r.customer_id, r]));
  const agreementsByCustomer = summarizeAgreementsByCustomer(openInst);

  const customers: ExistingCustomerOption[] = customerRecords.map((c) => {
    const statusRow = statusByCustomer.get(c.id);
    return {
      id: c.id,
      fullName: c.full_name,
      accNo: c.acc_no,
      cell: c.cell,
      cnic: c.cnic,
      address: c.address,
      area: c.area,
      avoId: c.avo_id,
      guarantors: toGuarantorBriefs(c.guarantors),
      noGuarantorReason: c.no_guarantor_reason,
      status: statusRow?.status ?? NO_ACTIVE_PLAN,
      openAgreementsCount: (agreementsByCustomer.get(c.id) ?? []).length,
      monthlyDue: Math.max(0, statusRow?.due_now ?? 0),
      remaining: Math.max(0, statusRow?.remaining ?? 0),
    };
  });

  const products: ProductOption[] = ((productsRes.data ?? []) as unknown as ProductRecord[]).map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.categories?.name ?? null,
    price: p.price,
    stock: p.stock,
  }));

  const areas = Array.from(new Set(customers.map((c) => c.area).filter((a): a is string => !!a))).sort();

  const officers: OfficerOption[] = ((officersRes.data ?? []) as { id: string; full_name: string; zone: string | null }[]).map((o) => ({
    id: o.id,
    fullName: o.full_name,
    zone: o.zone,
  }));

  return { customers, products, officers, areas };
}
