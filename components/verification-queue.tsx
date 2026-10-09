"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Home, Camera } from "lucide-react";
import { approveVerificationAction, rejectVerificationAction } from "@/app/actions/recovery";
import { showToast } from "@/lib/toast";
import type { PendingVerification } from "@/lib/data/recovery";

export function VerificationQueue({ verifications }: { verifications: PendingVerification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function approve(v: PendingVerification) {
    startTransition(async () => {
      const res = await approveVerificationAction(v.id);
      showToast(res.ok ? `${v.customerName}'s agreement is now open` : res.error);
      router.refresh();
    });
  }

  function reject(v: PendingVerification) {
    startTransition(async () => {
      const res = await rejectVerificationAction(v.id);
      showToast(res.ok ? `${v.customerName}'s agreement was cancelled` : res.error);
      router.refresh();
    });
  }

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <h2 className="text-[16.5px] font-extrabold m-0">Verification queue</h2>
      {verifications.length === 0 && (
        <div className="text-[13px] text-ink2 py-2">Nothing pending — every house visit has been reviewed.</div>
      )}
      {verifications.map((v) => (
        <div key={v.id} className="flex items-center gap-3 py-[11px] border-b border-line flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <div className="text-[13.5px] font-bold">{v.customerName}</div>
            <div className="text-[11.5px] text-ink3">
              Acc {v.accNo} · {v.avoName}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11.5px] text-ink2">
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
          <div className="flex gap-[7px]">
            <button
              onClick={() => approve(v)}
              disabled={pending}
              className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold bg-g600 text-white disabled:opacity-60"
            >
              <CheckCircle size={14} strokeWidth={2.4} />
              Approve
            </button>
            <button
              onClick={() => reject(v)}
              disabled={pending}
              className="border border-line cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold bg-white text-red disabled:opacity-60"
            >
              <XCircle size={14} strokeWidth={2.4} />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
