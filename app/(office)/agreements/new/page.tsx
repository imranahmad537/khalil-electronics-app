import { AgreementForm } from "@/components/agreement-form";
import { getAgreementFormData } from "@/lib/data/agreement-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewAgreementPage() {
  const supabase = await createClient();
  const [{ customers, products, officers, areas }, userRes] = await Promise.all([
    getAgreementFormData(),
    supabase.auth.getUser(),
  ]);

  let officerName = "Office";
  if (userRes.data.user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userRes.data.user.id).single();
    officerName = profile?.full_name ?? userRes.data.user.email ?? "Office";
  }

  return (
    <AgreementForm customers={customers} products={products} officers={officers} areas={areas} officerName={officerName} />
  );
}
