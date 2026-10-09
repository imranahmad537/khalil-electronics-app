import { getAvoData } from "@/lib/data/avo";
import { AvoCustomerList } from "@/components/avo-customer-list";

export default async function AvoCustomersPage() {
  const data = await getAvoData();
  if (!data) return null;

  return <AvoCustomerList officerName={data.officerName} customers={data.customers} />;
}
