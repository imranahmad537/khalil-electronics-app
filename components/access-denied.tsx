import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export function AccessDenied({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} hint="Restricted" />
      <div className="flex-1 min-h-[320px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col items-center justify-center gap-3 text-center p-10">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red flex items-center justify-center">
          <ShieldAlert size={26} strokeWidth={2.2} />
        </div>
        <h2 className="text-[16.5px] font-extrabold m-0">Your role doesn&apos;t have access to this</h2>
        <p className="m-0 text-[13px] text-ink2 max-w-[420px]">{note}</p>
        <Link href="/dashboard" className="text-[12.5px] font-bold text-g700 mt-1">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
