"use client";

import { useState } from "react";
import { Sidebar, type SidebarBadges } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "@/components/toaster";
import { SyncManager } from "@/components/sync-manager";
import { CheckInPrompt } from "@/components/check-in-prompt";
import type { Permissions } from "@/lib/permissions";
import type { MyAttendanceToday } from "@/lib/data/attendance";

export function AppShell({
  shopName,
  userName,
  userRole,
  windowNote,
  badges,
  permissions,
  attendance,
  children,
}: {
  shopName: string;
  userName: string;
  userRole: string;
  windowNote: string;
  badges: SidebarBadges;
  permissions: Permissions;
  attendance: MyAttendanceToday;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell h-screen flex overflow-hidden bg-page p-3.5 gap-3.5">
      <Sidebar open={sidebarOpen} shopName={shopName} badges={badges} permissions={permissions} />

      <div className="app-main flex-1 min-w-0 flex flex-col gap-3.5">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          windowNote={windowNote}
          userName={userName}
          userRole={userRole}
          attendance={attendance}
        />
        <div className="app-content scroll flex-1 min-h-0 flex flex-col gap-4 pr-0.5">
          <SyncManager />
          {children}
        </div>
      </div>
      <CheckInPrompt data={attendance} variant="office" />
      <Toaster />
    </div>
  );
}
