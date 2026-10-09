import { getAvoVerifications } from "@/lib/data/avo";
import { AvoVerifyList } from "@/components/avo-verify-list";

export default async function AvoVerifyPage() {
  const verifications = await getAvoVerifications();
  return <AvoVerifyList verifications={verifications} />;
}
