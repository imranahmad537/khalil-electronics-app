"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

// The AVO's house visit is the single approval authority (README rule 6).
// submit_visit() records the visit and, in the same transaction, opens or
// cancels exactly the agreement this verification belongs to. Approving
// requires at least one house photo — enforced in SQL, checked here first
// for a friendlier message.
export async function submitVisitAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const verificationId = formData.get("verificationId") as string;
  const customerId = formData.get("customerId") as string;
  const decision = formData.get("decision") as string;
  const houseType = (formData.get("houseType") as string) || "";
  const notes = (formData.get("notes") as string) || "";
  const lat = formData.get("lat") as string | null;
  const lng = formData.get("lng") as string | null;
  const photo = formData.get("photo") as File | null;

  if (!verificationId || !customerId) return { ok: false, error: "Missing verification." };
  if (decision !== "approve" && decision !== "reject") return { ok: false, error: "Choose approve or reject." };
  const approve = decision === "approve";
  const hasPhoto = !!photo && photo.size > 0;

  if (approve && !hasPhoto) return { ok: false, error: "Take a house photo before approving." };
  if (!approve && !notes.trim()) return { ok: false, error: "Add a note saying why the visit failed." };

  const supabase = await createClient();

  const newPaths: string[] = [];
  if (hasPhoto) {
    const ext = PHOTO_TYPES[photo.type];
    if (!ext) return { ok: false, error: "The photo must be a JPEG, PNG, WebP or HEIC image." };
    if (photo.size > MAX_PHOTO_BYTES) return { ok: false, error: "The photo is larger than 8 MB — retake it at a lower resolution." };

    // never trust the device's file name in a storage path
    const path = `${customerId}/${verificationId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("verifications").upload(path, photo, {
      contentType: photo.type,
    });
    if (uploadError) return { ok: false, error: friendlyDbError(uploadError, "Photo upload failed — try again.") };
    newPaths.push(path);
  }

  const { error } = await supabase.rpc("submit_visit", {
    p_verification: verificationId,
    p_approve: approve,
    p_house_type: houseType,
    p_notes: notes,
    p_photo_paths: newPaths,
    p_lat: lat ? Number(lat) : null,
    p_lng: lng ? Number(lng) : null,
  });
  if (error) {
    if (newPaths.length) await supabase.storage.from("verifications").remove(newPaths);
    return { ok: false, error: friendlyDbError(error, "Could not submit the visit.") };
  }

  revalidatePath("/avo");
  revalidatePath("/recovery");
  revalidatePath("/customers");
  return { ok: true };
}
