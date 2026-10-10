"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Users, ShieldCheck } from "lucide-react";
import { money } from "@/lib/money";
import { Toaster } from "@/components/toaster";
import { SyncManager } from "@/components/sync-manager";
import { RegisterSW } from "@/components/register-sw";

export function AvoShell({
  officerName,
  monthLabel,
  collected,
  outstanding,
  children,
}: {
  officerName: string;
  monthLabel: string;
  collected: number;
  outstanding: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-page flex flex-col items-center p-3.5">
      <div className="w-full max-w-[420px] flex flex-col gap-3.5">
        <div className="rounded-[var(--r-lg)] bg-g900 text-white p-5 flex flex-col gap-4">
          <div className="flex items-center gap-[9px]">
            <span className="flex items-center justify-center w-7 h-7 flex-none rounded-[9px] bg-white/[.14]">
              <MapPin size={16} strokeWidth={2.4} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-extrabold truncate">{officerName}</div>
              <div className="text-[11.5px] text-white/70">{monthLabel}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10.5px] font-bold tracking-[.06em] uppercase text-white/60">Collected</span>
              <span className="num text-[20px] font-extrabold">{money(collected)}</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10.5px] font-bold tracking-[.06em] uppercase text-white/60">Outstanding</span>
              <span className="num text-[20px] font-extrabold">{money(outstanding)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-[5px] p-1 bg-panel rounded-full shadow-[var(--sh)]">
          <Link
            href="/avo"
            className="flex-1 text-center border-0 cursor-pointer rounded-full px-[14px] py-[10px] text-[12.5px] font-bold flex items-center justify-center gap-[6px]"
            style={{
              background: pathname === "/avo" ? "var(--ink)" : "transparent",
              color: pathname === "/avo" ? "#fff" : "var(--ink2)",
            }}
          >
            <Users size={14} strokeWidth={2.4} />
            My customers
          </Link>
          <Link
            href="/avo/verify"
            className="flex-1 text-center border-0 cursor-pointer rounded-full px-[14px] py-[10px] text-[12.5px] font-bold flex items-center justify-center gap-[6px]"
            style={{
              background: pathname === "/avo/verify" ? "var(--ink)" : "transparent",
              color: pathname === "/avo/verify" ? "#fff" : "var(--ink2)",
            }}
          >
            <ShieldCheck size={14} strokeWidth={2.4} />
            Verify
          </Link>
        </div>

        <SyncManager />
        {children}
      </div>
      <Toaster />
      <RegisterSW />
    </div>
  );
}
