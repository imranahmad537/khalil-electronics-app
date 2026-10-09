"use client";

import { useState } from "react";
import { Sidebar, type SidebarBadges } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "@/components/toaster";
import type { Permissions } from "@/lib/permissions";

export function AppShell({
  shopName,
  userName,
  userRole,
  windowNote,
  badges,
  permissions,
  children,
}: {
  shopName: string;
  userName: string;
  userRole: string;
  windowNote: string;
  badges: SidebarBadges;
  permissions: Permissions;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex overflow-hidden bg-page p-3.5 gap-3.5">
      <Sidebar open={sidebarOpen} shopName={shopName} badges={badges} permissions={permissions} />

      <div className="flex-1 min-w-0 flex flex-col gap-3.5">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          windowNote={windowNote}
          userName={userName}
          userRole={userRole}
        />
        <div className="scroll flex-1 min-h-0 flex flex-col gap-4 pr-0.5">{children}</div>
      </div>
      <Toaster />
    </div>
  );
}
