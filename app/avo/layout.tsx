import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getAvoData } from "@/lib/data/avo";
import { AvoShell } from "@/components/avo-shell";
import { getMyAttendanceToday } from "@/lib/data/attendance";
import { SHOP_TZ } from "@/lib/shop-time";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KE Field" },
};

export const viewport: Viewport = {
  themeColor: "#0c4a2c",
};

export default async function AvoLayout({ children }: { children: React.ReactNode }) {
  const [data, attendance] = await Promise.all([getAvoData(), getMyAttendanceToday()]);
  if (!data) redirect("/login");

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: SHOP_TZ });

  return (
    <AvoShell officerName={data.officerName} monthLabel={monthLabel} collected={data.collectedThisMonth} outstanding={data.outstanding} attendance={attendance}>
      {children}
    </AvoShell>
  );
}
