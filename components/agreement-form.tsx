"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CustomerPicker } from "@/components/customer-picker";
import { GuarantorsSection } from "@/components/guarantors-section";
import { ProductLineTable } from "@/components/product-line-table";
import { PaymentSection, PlanPicker, financedAmount } from "@/components/payment-section";
import { AgreementSummary, type SummaryRow } from "@/components/agreement-summary";
import { createNewAgreementAction } from "@/app/actions/agreements";
import { agreementFormSchema, defaultAgreementValues, type AgreementFormValues } from "@/lib/agreement-schema";
import { newClientRef } from "@/lib/offline-queue";
import { enterToNextField } from "@/lib/enter-to-next";
import { showToast } from "@/lib/toast";
import { money } from "@/lib/money";
import type { ExistingCustomerOption, OfficerOption, ProductOption } from "@/lib/data/agreement-form";

export function AgreementForm({
  customers,
  products,
  officers,
  areas,
  officerName,
}: {
  customers: ExistingCustomerOption[];
  products: ProductOption[];
  officers: OfficerOption[];
  areas: string[];
  officerName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Idempotency key for this sale. Kept across retries of the same Save (a
  // lost response + second click returns the already-saved sale instead of
  // creating a duplicate); create_sale rolls back entirely on any error, so
  // reusing it after a validation failure is safe.
  const clientRef = useRef(newClientRef());
  const submitting = useRef(false);

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementFormSchema),
    defaultValues: defaultAgreementValues(),
    mode: "onSubmit",
  });
  const values = form.watch();

  const defaulterCnics = useMemo(
    () => new Set(customers.filter((c) => c.status === "default" && c.cnic).map((c) => c.cnic as string)),
    [customers]
  );

  const validItems = values.items.filter((i) => i.productId && i.qty > 0);
  const total = validItems.reduce((t, i) => t + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const isInstallment = !!values.plan;
  const isDirect = values.plan === 0;
  const financed = financedAmount(total, values.advance);
  const monthly = isInstallment ? Math.round(financed / (values.plan as number)) || 0 : 0;
  const selectedCustomer = customers.find((c) => c.id === values.customerId) ?? null;

  const rows: SummaryRow[] = isInstallment
    ? [
        { label: "Sale price", value: money(total) },
        { label: "Advance", value: money(values.advance || 0) },
        { label: `Monthly × ${values.plan}`, value: money(monthly) },
        { label: "Collect today", value: money((values.advance || 0) + monthly), big: true },
        { label: `Balance over ${(values.plan as number) - 1} months`, value: money(Math.max(0, financed - monthly)) },
      ]
    : [
        { label: "Sale price", value: money(total) },
        { label: "Collect today", value: money(total), big: true },
      ];

  const customerDone =
    values.mode === "existing"
      ? !!values.customerId
      : !!values.fullName.trim() && !!values.cnic && !!values.cell && !!values.address.trim();
  const guarantorsDone =
    !isInstallment ||
    (values.mode === "existing" && values.useExistingGuarantors) ||
    (values.noGuarantor
      ? !!values.noGuarantorReason.trim()
      : values.guarantors.length > 0 && values.guarantors.every((g) => g.name.trim() && g.cnic && g.cell));
  const checklist = [
    { label: "Customer details", done: customerDone },
    { label: "Payment plan", done: values.plan !== null },
    { label: "Guarantors", done: guarantorsDone },
    { label: "At least one product", done: validItems.length > 0 && total > 0 },
  ];
  const missingCount = checklist.filter((c) => !c.done).length;

  function onValid(v: AgreementFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    startTransition(async () => {
      try {
        let res: Awaited<ReturnType<typeof createNewAgreementAction>>;
        try {
          res = await createNewAgreementAction({
            clientRef: clientRef.current,
            mode: v.mode,
            customerId: v.customerId,
            newCustomer:
              v.mode === "new"
                ? {
                    fullName: v.fullName,
                    fatherName: v.fatherName,
                    cnic: v.cnic,
                    cell: v.cell,
                    cell2: v.cell2,
                    area: v.area,
                    address: v.address,
                    occupation: v.occupation,
                    avoId: v.avoId,
                  }
                : null,
            useExistingGuarantors: v.mode === "existing" && v.useExistingGuarantors,
            guarantors: v.guarantors,
            noGuarantor: v.noGuarantor,
            noGuarantorReason: v.noGuarantorReason,
            items: v.items,
            plan: v.plan ?? 0,
            advance: v.advance,
            paymentMode: v.paymentMode,
            paymentAccount: v.paymentAccount,
          });
        } catch {
          setError("Connection problem — check the network and press Save again. It won't create a duplicate.");
          return;
        }
        if (!res.ok) {
          setError(res.error);
          return;
        }

        if (!res.isInstallment && res.receiptId) {
          showToast(`Direct sale saved · agreement #${res.agreementNo}`);
          router.push(`/receipts/${res.receiptId}/print`);
          return;
        }
        showToast(
          `Agreement #${res.agreementNo} saved · ${money(monthly)} × ${v.plan} · ` +
            (res.avoName ? `sent to ${res.avoName} for house visit` : "no AVO available — assign one in Recovery")
        );
        router.push(`/customers/${res.customerId}`);
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={(e) => e.preventDefault()} onKeyDown={enterToNextField} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h1 className="text-[20px] font-extrabold m-0">New agreement</h1>
            <span className="text-[12px] text-ink3">Sales officer: {officerName}</span>
          </div>

          <CustomerPicker customers={customers} officers={officers} areas={areas} />
          <PlanPicker total={total} />

          {isInstallment && <GuarantorsSection selectedCustomer={selectedCustomer} defaulterCnics={defaulterCnics} />}

          <ProductLineTable products={products} />
          <PaymentSection total={total} />
          {error && <div className="text-[12.5px] font-semibold text-red">{error}</div>}
        </div>

        <AgreementSummary
          rows={rows}
          checklist={isInstallment ? checklist : checklist.filter((c) => c.label !== "Guarantors")}
          missingCount={isInstallment ? missingCount : checklist.filter((c) => c.label !== "Guarantors" && !c.done).length}
          pending={pending}
          isDirect={isDirect}
          onSubmit={form.handleSubmit(onValid, () => setError("Fix the highlighted fields first."))}
        />
      </form>
    </FormProvider>
  );
}
