"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";

/**
 * App shell: modern collapsible sidebar (from @blocks-so/sidebar-02) + main
 * content area. The sidebar is inset variant — shows full when expanded, icons
 * only when collapsed. Toggle via the SidebarTrigger button in the sidebar
 * header (or Cmd+B).
 *
 * No mobile header bar — the sidebar handles its own mobile mode (slide-over).
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
      <DashboardSidebar userName={userName} />
      <SidebarInset className="flex flex-col overflow-hidden">
        <main className="relative flex-1 overflow-y-auto bg-background">
          {children}
        </main>
        {/* Top fade — overlays the top edge of the card, zero layout impact */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-50 h-6"
          style={{
            background: "linear-gradient(to bottom, var(--background), transparent)",
          }}
        />
        {/* Bottom fade — reversed, overlays the bottom edge of the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-6"
          style={{
            background: "linear-gradient(to top, var(--background), transparent)",
          }}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
