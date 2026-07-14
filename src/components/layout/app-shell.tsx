"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * App shell: modern collapsible sidebar (from @blocks-so/sidebar-02) + main
 * content area. The sidebar is inset (overlay on mobile, push on desktop) and
 * includes the theme toggle + logout.
 */
export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex h-dvh w-full">
        <DashboardSidebar userName={userName} />
        <SidebarInset className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">Oba Green</span>
          </div>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
