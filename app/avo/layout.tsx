import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getAvoData } from "@/lib/data/avo";
import { AvoShell } from "@/components/avo-shell";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KE Field" },
};

export const viewport: Viewport = {
  themeColor: "#0c4a2c",
};

export default async function AvoLayout({ children }: { children: React.ReactNode }) {
  const data = await getAvoData();
  if (!data) redirect("/login");

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <AvoShell officerName={data.officerName} monthLabel={monthLabel} collected={data.collectedThisMonth} outstanding={data.outstanding}>
      {children}
    </AvoShell>
  );
}
