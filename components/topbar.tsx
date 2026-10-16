"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, Clock, Mail } from "lucide-react";
import { initials } from "@/lib/money";
import { AttendanceWidget } from "@/components/attendance-widget";
import { LogoutButton } from "@/components/logout-button";
import type { MyAttendanceToday } from "@/lib/data/attendance";

export function Topbar({
  onToggleSidebar,
  windowNote,
  userName,
  userRole,
  attendance,
}: {
  onToggleSidebar: () => void;
  windowNote: string;
  userName: string;
  userRole: string;
  attendance: MyAttendanceToday;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isField = pathname.startsWith("/avo");
  const urlQuery = pathname === "/customers" ? (searchParams.get("q") ?? "") : "";
  const [query, setQuery] = useState(urlQuery);
  // Page the user was on before the search took them to /customers; clearing the box returns there.
  const originRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last term this box put in the URL, so our own navigations don't overwrite what's being typed.
  const sentRef = useRef(urlQuery);

  // Keep the box in sync when the URL changes elsewhere (e.g. "Clear search", navigating away).
  useEffect(() => {
    if (urlQuery !== sentRef.current) {
      sentRef.current = urlQuery;
      setQuery(urlQuery);
    }
    if (pathname !== "/customers") originRef.current = null;
  }, [urlQuery, pathname]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function runSearch(value: string) {
    const term = value.trim();
    sentRef.current = term;
    const onRegister = pathname === "/customers";
    if (!term) {
      const origin = originRef.current;
      if (origin) {
        // Search started elsewhere (e.g. dashboard): go back there.
        originRef.current = null;
        router.replace(origin);
      } else if (onRegister && searchParams.get("q")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("q");
        const qs = params.toString();
        window.history.replaceState(null, "", `/customers${qs ? "?" + qs : ""}`);
      }
      return;
    }
    if (onRegister) {
      // Already on the register: it filters client-side, so just update the URL (no server reload).
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", term);
      window.history.replaceState(null, "", `/customers?${params.toString()}`);
    } else if (originRef.current) {
      // Register is still loading from the first keystrokes; just retarget it.
      router.replace(`/customers?q=${encodeURIComponent(term)}`);
    } else {
      originRef.current = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      router.push(`/customers?q=${encodeURIComponent(term)}`);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Off the register, wait briefly before navigating; on it, filtering is instant.
    const delay = pathname !== "/customers" && value.trim() ? 250 : 0;
    timerRef.current = setTimeout(() => runSearch(value), delay);
  }

  return (
    <div className="topbar flex-none px-4 py-[11px] bg-panel rounded-[var(--r-lg)] shadow-[var(--sh)]">
      <button
        className="iconbtn border-0 cursor-pointer w-9 h-9 rounded-[11px] bg-soft text-ink2 flex items-center justify-center"
        title="Show / hide menu"
        onClick={onToggleSidebar}
      >
        <Menu size={18} strokeWidth={2.4} />
      </button>

      <div className="searchbox flex items-center gap-[9px] px-[14px] py-[9px] rounded-full bg-soft text-ink3">
        <Search size={16} strokeWidth={2.4} />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (timerRef.current) clearTimeout(timerRef.current);
              runSearch(query);
            }
          }}
          placeholder="Search customer, account, cell…"
          className="flex-1 min-w-0 border-0 bg-transparent text-[13.5px] text-ink outline-none"
        />
        <span className="num hide-md text-[10.5px] font-bold px-[7px] py-[3px] rounded-[7px] bg-white text-ink3 border border-line">
          Enter
        </span>
      </div>

      <div className="hide-md flex items-center gap-2 px-[13px] py-[7px] rounded-full bg-g50 text-g700 text-xs font-semibold whitespace-nowrap">
        <Clock size={14} strokeWidth={2.4} />
        <span>{windowNote}</span>
      </div>

      <div className="flex-1 min-w-0" />

      <AttendanceWidget data={attendance} variant="office" />

      <div className="flex-none flex gap-[5px] p-1 bg-soft rounded-full">
        <Link
          href="/dashboard"
          className="border-0 cursor-pointer rounded-full px-[15px] py-[7px] text-[12.5px] font-bold"
          style={{
            background: !isField ? "var(--ink)" : "transparent",
            color: !isField ? "#fff" : "var(--ink2)",
          }}
        >
          Office
        </Link>
        <Link
          href="/avo"
          className="border-0 cursor-pointer rounded-full px-[15px] py-[7px] text-[12.5px] font-bold"
          style={{
            background: isField ? "var(--ink)" : "transparent",
            color: isField ? "#fff" : "var(--ink2)",
          }}
        >
          Field
        </Link>
      </div>

      <button
        className="iconbtn flex-none border-0 cursor-pointer w-9 h-9 rounded-full bg-soft text-ink2 flex items-center justify-center"
        title="Message centre"
      >
        <Mail size={17} strokeWidth={2.4} />
      </button>

      <div className="flex-none flex items-center gap-[9px] pl-[11px] border-l border-line">
        <div className="w-[34px] h-[34px] flex-none rounded-full bg-g100 flex items-center justify-center text-[12.5px] font-extrabold text-g900">
          {initials(userName)}
        </div>
        <div className="hide-sm flex flex-col leading-[1.3]">
          <span className="text-[12.5px] font-bold">{userName}</span>
          <span className="text-[11px] text-ink3">{userRole}</span>
        </div>
      </div>

      <LogoutButton variant="office" attendance={attendance} />
    </div>
  );
}
