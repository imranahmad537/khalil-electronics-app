"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle, Home, XCircle } from "lucide-react";
import { submitVisitAction } from "@/app/actions/verifications";
import { getPositionSafe } from "@/lib/offline-queue";
import { showToast } from "@/lib/toast";
import type { AvoVerification } from "@/lib/data/avo";

function VerificationCard({ v }: { v: AvoVerification }) {
  const router = useRouter();
  const [houseType, setHouseType] = useState("owned");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(decision: "approve" | "reject") {
    setError("");
    if (decision === "approve" && !photo) {
      setError("Take a house photo before approving.");
      return;
    }
    if (decision === "reject" && !notes.trim()) {
      setError("Add a note saying why the visit failed.");
      return;
    }
    startTransition(async () => {
      const position = await getPositionSafe();
      const formData = new FormData();
      formData.set("verificationId", v.id);
      formData.set("customerId", v.customerId);
      formData.set("decision", decision);
      formData.set("houseType", houseType);
      formData.set("notes", notes);
      if (position) {
        formData.set("lat", String(position.lat));
        formData.set("lng", String(position.lng));
      }
      if (photo) formData.set("photo", photo);

      const res = await submitVisitAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(
        decision === "approve" ? `${v.customerName}'s agreement is now open` : `${v.customerName}'s sale was cancelled`
      );
      router.refresh();
    });
  }

  return (
    <div className="rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] p-4 flex flex-col gap-3">
      <div>
        <div className="text-[14.5px] font-bold">{v.customerName}</div>
        <div className="text-[11.5px] text-ink3">
          Acc {v.accNo} · {v.area ?? "—"}
        </div>
      </div>

      <div className="flex gap-[6px] p-1 bg-soft rounded-full">
        {(["owned", "rented"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setHouseType(t)}
            className="flex-1 border-0 cursor-pointer rounded-full px-[10px] py-[8px] text-[12px] font-bold capitalize"
            style={{ background: houseType === t ? "var(--ink)" : "transparent", color: houseType === t ? "#fff" : "var(--ink2)" }}
          >
            <Home size={12} strokeWidth={2.4} className="inline mr-1 -mt-[2px]" />
            {t}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes from the visit…"
        rows={2}
        className="px-[13px] py-[10px] rounded-xl border border-line bg-soft text-[13px] text-ink outline-none resize-none"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="border border-line cursor-pointer rounded-xl px-[13px] py-[10px] flex items-center gap-[8px] text-[12.5px] font-semibold text-ink2 bg-white"
      >
        <Camera size={15} strokeWidth={2.4} />
        {photo ? "Photo added — tap to retake" : "Add house photo (required to approve)"}
      </button>

      {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={() => submit("reject")}
          disabled={pending}
          className="border border-line cursor-pointer rounded-full px-[16px] py-[12px] flex items-center justify-center gap-[6px] text-[13px] font-bold bg-white text-red disabled:opacity-60"
        >
          <XCircle size={15} strokeWidth={2.4} />
          Reject
        </button>
        <button
          onClick={() => submit("approve")}
          disabled={pending}
          className="btnp flex-1 border-0 cursor-pointer rounded-full py-[12px] flex items-center justify-center gap-[7px] text-[13px] font-bold bg-g600 text-white disabled:opacity-60"
        >
          <CheckCircle size={15} strokeWidth={2.4} />
          {pending ? "Submitting…" : "Approve & open agreement"}
        </button>
      </div>
    </div>
  );
}

export function AvoVerifyList({ verifications }: { verifications: AvoVerification[] }) {
  if (verifications.length === 0) {
    return (
      <div className="p-7 text-center text-[13px] text-ink2 bg-panel rounded-[var(--r-lg)] shadow-[var(--sh)]">
        No house visits pending — you&apos;re all caught up.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {verifications.map((v) => (
        <VerificationCard key={v.id} v={v} />
      ))}
    </div>
  );
}
