"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export function Toaster() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function handler(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      setMsg(detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(""), 2800);
    }
    window.addEventListener("app-toast", handler);
    return () => {
      window.removeEventListener("app-toast", handler);
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 flex items-center gap-[10px] bg-ink text-white text-[13px] font-semibold px-5 py-[13px] rounded-full shadow-[var(--sh)]">
      <CheckCircle size={16} strokeWidth={2.4} />
      {msg}
    </div>
  );
}
