import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AvoFieldApp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  return (
    <div className="min-h-screen bg-page flex flex-col items-center p-4">
      <div className="w-full max-w-[420px] flex flex-col gap-4">
        <div className="rounded-[var(--r-lg)] bg-g900 text-white p-5 flex flex-col gap-3">
          <div className="flex items-center gap-[9px]">
            <span className="flex items-center justify-center w-7 h-7 rounded-[9px] bg-white/[.14]">
              <MapPin size={16} strokeWidth={2.4} />
            </span>
            <span className="text-[13.5px] font-bold">Field app</span>
          </div>
          <div>
            <div className="text-[20px] font-extrabold">{profile?.full_name ?? "Officer"}</div>
            <div className="text-[12.5px] text-white/70">
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] p-7 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-g50 text-g700 flex items-center justify-center">
            <MapPin size={26} strokeWidth={2.2} />
          </div>
          <h2 className="text-[16.5px] font-extrabold m-0">The AVO field app is build step 8</h2>
          <p className="m-0 text-[13px] text-ink2">
            My customers, the collect dialog, GPS capture, the offline queue and the verification queue land
            after agreements, receipts and the office dashboard are in place.
          </p>
        </div>
      </div>
    </div>
  );
}
