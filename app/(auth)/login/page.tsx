"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SHOP_NAME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <form
        onSubmit={onSubmit}
        className="w-[380px] max-w-full bg-panel rounded-[var(--r-lg)] shadow-[var(--sh)] p-7 flex flex-col gap-4"
      >
        <div className="flex items-center gap-[11px]">
          <div className="w-[34px] h-[34px] flex-none rounded-[11px] bg-g600 flex items-center justify-center text-white">
            <Zap size={18} strokeWidth={2.2} />
          </div>
          <span className="text-[17px] font-extrabold tracking-[-.3px]">{SHOP_NAME}</span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-extrabold m-0">Sign in</h1>
          <p className="m-0 text-[12.5px] text-ink3">Office and field access for your team.</p>
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="text-[11.5px] font-bold text-ink2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <label className="text-[11.5px] font-bold text-ink2">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
          />
        </div>

        {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g600 text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
