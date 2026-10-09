"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitVisitAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const verificationId = formData.get("verificationId") as string;
  const customerId = formData.get("customerId") as string;
  const houseType = (formData.get("houseType") as string) || "";
  const notes = (formData.get("notes") as string) || "";
  const lat = formData.get("lat") as string | null;
  const lng = formData.get("lng") as string | null;
  const photo = formData.get("photo") as File | null;

  if (!verificationId || !customerId) return { ok: false, error: "Missing verification." };

  const supabase = await createClient();

  const newPaths: string[] = [];
  if (photo && photo.size > 0) {
    const path = `${customerId}/${Date.now()}-${photo.name}`;
    const { error: uploadError } = await supabase.storage.from("verifications").upload(path, photo, {
      contentType: photo.type || "image/jpeg",
    });
    if (uploadError) return { ok: false, error: uploadError.message };
    newPaths.push(path);
  }

  if (newPaths.length > 0) {
    const { data: existing } = await supabase.from("verifications").select("photo_paths").eq("id", verificationId).single();
    const merged = [...(existing?.photo_paths ?? []), ...newPaths];
    const { error: updateError } = await supabase
      .from("verifications")
      .update({
        house_type: houseType || null,
        notes: notes || null,
        photo_paths: merged,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        visited_at: new Date().toISOString(),
      })
      .eq("id", verificationId);
    if (updateError) return { ok: false, error: updateError.message };
  } else {
    const { error: updateError } = await supabase
      .from("verifications")
      .update({
        house_type: houseType || null,
        notes: notes || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        visited_at: new Date().toISOString(),
      })
      .eq("id", verificationId);
    if (updateError) return { ok: false, error: updateError.message };
  }

  const { error: approveError } = await supabase.rpc("approve_verification", { p_verification: verificationId });
  if (approveError) return { ok: false, error: approveError.message };

  revalidatePath("/avo");
  revalidatePath("/recovery");
  revalidatePath("/customers");
  return { ok: true };
}
