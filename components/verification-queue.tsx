"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Home, Camera, Clock, CheckCircle } from "lucide-react";
import { rejectVerificationAction } from "@/app/actions/recovery";
import { showToast } from "@/lib/toast";
import type { PendingVerification } from "@/lib/data/recovery";

// Approval is the AVO's call, made on the house visit in the field app. The
// office sees what's waiting and what was recently opened, and an owner or
// manager can reject either (e.g. fraud found after the visit).
export function VerificationQueue({
  verifications,
  canReject,
}: {
  verifications: PendingVerification[];
  canReject: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function reject(v: PendingVerification) {
    if (!reason.trim()) {
      showToast("Add a reason for rejecting");
      return;
    }
    startTransition(async () => {
      const res = await rejectVerificationAction(v.id, reason);
      showToast(res.ok ? `${v.customerName}'s agreement was cancelled and stock returned` : res.error);
      if (res.ok) {
        setRejecting(null);
        setReason("");
      }
      router.refresh();
    });
  }

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div>
        <h2 className="text-[16.5px] font-extrabold m-0">Verification queue</h2>
        <p className="m-0 mt-1 text-[12px] text-ink3">
          The assigned AVO approves or rejects on the house visit. Approved in the last 14 days are listed so they can still be reversed.
        </p>
      </div>
      {verifications.length === 0 && (
        <div className="text-[13px] text-ink2 py-2">Nothing pending — every house visit has been reviewed.</div>
      )}
      {verifications.map((v) => (
        <div key={v.id} className="flex flex-col gap-2 py-[11px] border-b border-line">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <div className="text-[13.5px] font-bold">{v.customerName}</div>
              <div className="text-[11.5px] text-ink3">
                Acc {v.accNo} · {v.avoName}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-ink2">
              {v.status === "pending" ? (
                <span className="flex items-center gap-1 font-semibold text-amber">
                  <Clock size={13} strokeWidth={2.4} />
                  Awaiting visit
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-g700">
                  <CheckCircle size={13} strokeWidth={2.4} />
                  Approved by AVO
                </span>
              )}
              {v.houseType && (
                <span className="flex items-center gap-1">
                  <Home size={13} strokeWidth={2.4} />
                  {v.houseType}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Camera size={13} strokeWidth={2.4} />
                {v.photoCount}
              </span>
            </div>
            {canReject && rejecting !== v.id && (
              <button
                onClick={() => {
                  setRejecting(v.id);
                  setReason("");
                }}
                disabled={pending}
                className="border border-line cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold bg-white text-red disabled:opacity-60"
              >
                <XCircle size={14} strokeWidth={2.4} />
                Reject
              </button>
            )}
          </div>
          {rejecting === v.id && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (e.g. address not found)"
                className="flex-1 min-w-[180px] px-[13px] py-[8px] rounded-xl border border-line bg-soft text-[12.5px] text-ink outline-none"
              />
              <button
                onClick={() => reject(v)}
                disabled={pending}
                className="border-0 cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-red text-white disabled:opacity-60"
              >
                {pending ? "Rejecting…" : "Reject & cancel sale"}
              </button>
              <button
                onClick={() => setRejecting(null)}
                className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2"
              >
                Keep
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
