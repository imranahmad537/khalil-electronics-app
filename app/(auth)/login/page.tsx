"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Clock, Boxes, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SHOP_NAME } from "@/lib/constants";
import { loginIdToEmail } from "@/lib/staff-login";
import { BrandLogo } from "@/components/brand-logo";
import { CHECKIN_DISMISS_PREFIX } from "@/components/check-in-prompt";

const FEATURES = [
  { icon: ShieldCheck, title: "Verified sales", text: "Every installment sale is checked with a house visit before it opens." },
  { icon: Clock, title: "On-time recovery", text: "Dues, reminders and field collections around the 1st–5th window." },
  { icon: Boxes, title: "One set of books", text: "Stock, purchases, expenses and payroll that always add up." },
];

const inputCls =
  "w-full pl-[42px] pr-[14px] py-[12px] rounded-xl border border-line bg-soft text-[14px] text-ink outline-none transition-colors focus:border-g500 focus:bg-white";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "inactive") {
      setError("This login has been deactivated. Ask the owner or manager if you think this is a mistake.");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: loginIdToEmail(email), password });
    setLoading(false);
    if (error) {
      setError(/invalid/i.test(error.message) ? "Wrong username or password." : error.message);
      return;
    }
    // a fresh login asks for check-in again, even if "Later" was pressed last time
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith(CHECKIN_DISMISS_PREFIX)) localStorage.removeItem(k);
    } catch {
      /* storage unavailable — nothing to clear */
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-page grid grid-cols-1 min-[860px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ---------- brand panel ---------- */}
      <section
        className="relative overflow-hidden text-white flex flex-col justify-between gap-8 min-h-[260px] min-[860px]:min-h-screen p-6 min-[860px]:p-12"
        style={{ background: "linear-gradient(150deg, var(--g900) 0%, var(--g700) 62%, var(--g600) 100%)" }}
      >
        {/* soft decorative rings */}
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 w-[360px] h-[360px] rounded-full border border-white/10" />
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 w-[220px] h-[220px] rounded-full border border-white/10" />
        <span aria-hidden className="pointer-events-none absolute -left-32 -bottom-40 w-[420px] h-[420px] rounded-full bg-white/[.04]" />

        <div className="relative">
          <BrandLogo tone="light" size={44} tagline="Installments · Recovery · Stock" />
        </div>

        <div className="relative flex flex-col gap-6 max-w-[460px]">
          <h2 className="m-0 text-[24px] min-[860px]:text-[34px] font-extrabold leading-[1.15] tracking-[-.8px]">
            Every sale, installment and rupee — in one place.
          </h2>
          <ul className="m-0 p-0 list-none hidden min-[860px]:flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="w-9 h-9 flex-none rounded-[11px] bg-white/[.12] flex items-center justify-center">
                  <Icon size={18} strokeWidth={2.4} />
                </span>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[14px] font-bold">{title}</span>
                  <span className="text-[13px] text-white/70 leading-[1.45]">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between gap-4 text-[12px] font-semibold">
          <span className="flex items-center gap-2 text-white/85">
            <CheckCircle2 size={15} strokeWidth={2.4} />
            Secure staff sign-in
          </span>
          <span className="text-white/55 max-[640px]:hidden">
            © {new Date().getFullYear()} {SHOP_NAME}
          </span>
        </div>
      </section>

      {/* ---------- sign-in form ---------- */}
      <main className="flex items-center justify-center p-4 min-[640px]:p-8 min-[860px]:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-[400px] flex flex-col gap-5">
          <div className="flex flex-col gap-[6px]">
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-.6px]">Welcome back</h1>
            <p className="m-0 text-[13.5px] text-ink2">Sign in with the username and password you were given.</p>
          </div>

          {error && (
            <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 text-red text-[12.5px] font-semibold leading-[1.45]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="login-id" className="text-[12px] font-bold text-ink2">
              Username or email
            </label>
            <div className="relative">
              <Mail size={17} strokeWidth={2.2} className="absolute left-[14px] top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
              <input
                id="login-id"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. waqas"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="login-password" className="text-[12px] font-bold text-ink2">
              Password
            </label>
            <div className="relative">
              <Lock size={17} strokeWidth={2.2} className="absolute left-[14px] top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={`${inputCls} pr-[46px]`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-[6px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer text-ink3 hover:text-ink2 flex items-center justify-center"
              >
                {showPassword ? <EyeOff size={17} strokeWidth={2.2} /> : <Eye size={17} strokeWidth={2.2} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btnp border-0 cursor-pointer rounded-full px-5 py-[14px] flex items-center justify-center gap-2 text-[14px] font-bold bg-g600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: "0 8px 20px rgba(15,107,60,.22)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight size={17} strokeWidth={2.6} />}
          </button>

          <p className="m-0 text-[12.5px] text-ink3 leading-[1.5]">
            Forgot your password? Ask the owner to reset it from <span className="font-semibold text-ink2">Users &amp; logins</span>.
          </p>
        </form>
      </main>
    </div>
  );
}
