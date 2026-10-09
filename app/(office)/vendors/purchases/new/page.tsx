import { PageHeader } from "@/components/page-header";
import { PurchaseForm } from "@/components/purchase-form";
import { getVendorOptions, getProductOptionsWithCost } from "@/lib/data/products";
import { getCurrentPermissions } from "@/lib/current-user";
import { AccessDenied } from "@/components/access-denied";

export default async function NewPurchasePage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageFinance) {
    return <AccessDenied title="New purchase bill" note="Purchase bills are visible to owners, managers and accountants only." />;
  }

  const [vendors, products] = await Promise.all([getVendorOptions(), getProductOptionsWithCost()]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New purchase bill" hint="Vendor, items and cost" />
      <PurchaseForm vendors={vendors} products={products} />
    </div>
  );
}
