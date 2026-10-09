"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, MapPin } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import type { Permissions } from "@/lib/permissions";

export interface SidebarBadges {
  customers: number;
  receipts: number;
  recovery: number;
  recoveryAttention: boolean;
}

export function Sidebar({
  open,
  shopName,
  badges,
  permissions,
}: {
  open: boolean;
  shopName: string;
  badges: SidebarBadges;
  permissions: Permissions;
}) {
  const pathname = usePathname();

  const badgeFor = (key: string): number | string | null => {
    if (key === "customers") return badges.customers || null;
    if (key === "receipts") return badges.receipts || null;
    if (key === "recovery") return badges.recovery || null;
    return null;
  };

  return (
    <aside
      className={cn(
        "flex-none flex flex-col bg-panel rounded-[var(--r-lg)] shadow-[var(--sh)] overflow-hidden transition-[width] duration-150",
        open ? "w-[228px]" : "w-[76px]"
      )}
    >
      <div className="flex items-center gap-[11px] px-[18px] pt-5 pb-3.5">
        <div className="w-[34px] h-[34px] flex-none rounded-[11px] bg-g600 flex items-center justify-center text-white">
          <Zap size={18} strokeWidth={2.2} />
        </div>
        {open && (
          <span className="text-[17px] font-extrabold tracking-[-.3px] whitespace-nowrap">
            {shopName}
          </span>
        )}
      </div>

      <nav className="scroll flex-1 px-3 pb-3 flex flex-col gap-[3px]">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {open && (
              <div className="px-[10px] pt-3.5 pb-1.5 text-[10.5px] font-bold tracking-[.12em] text-ink3">
                {group.label}
              </div>
            )}
            {group.items
              .filter((item) => !item.requires || permissions[item.requires])
              .map((item) => {
              const active = pathname.startsWith(item.href);
              const badge = badgeFor(item.key);
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "navitem flex items-center gap-[11px] px-3 py-[10px] rounded-xl text-[13.5px] font-semibold",
                    open ? "justify-start" : "justify-center",
                    active ? "bg-g50 text-g900" : "text-ink2"
                  )}
                >
                  <span className={cn("flex", active ? "text-g600" : "text-ink3")}>
                    <Icon size={17} strokeWidth={2.4} />
                  </span>
                  {open && (
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                  {open && badge ? (
                    <span
                      className={cn(
                        "num text-[10.5px] font-bold px-2 py-0.5 rounded-full",
                        item.key === "recovery" && badges.recoveryAttention
                          ? "bg-red-50 text-red"
                          : "bg-soft text-ink2"
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {open && (
        <div className="mx-3.5 mb-4 p-[14px_15px] rounded-2xl bg-g900 text-white flex flex-col gap-[9px]">
          <div className="flex items-center gap-[9px]">
            <span className="flex items-center justify-center w-7 h-7 flex-none rounded-[9px] bg-white/[.14]">
              <MapPin size={16} strokeWidth={2.4} />
            </span>
            <span className="text-[13.5px] font-bold">Field app</span>
          </div>
          <Link
            href="/avo"
            className="btnp border-0 cursor-pointer px-[14px] py-[9px] rounded-full bg-g500 text-white text-[12.5px] font-bold text-center"
          >
            Open
          </Link>
        </div>
      )}
    </aside>
  );
}
