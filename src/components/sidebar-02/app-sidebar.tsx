"use client";

import {
  Boxes,
  ShoppingCart,
  Package,
  Building2,
  Truck,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import DashboardNavigation, { type Route } from "@/components/sidebar-02/nav-main";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/queries/session";

const navRoutes: Route[] = [
  {
    id: "batches",
    title: "Lotes",
    icon: <Boxes className="size-4" />,
    link: "/batches",
  },
  {
    id: "orders",
    title: "Pedidos",
    icon: <ShoppingCart className="size-4" />,
    link: "/orders",
  },
  {
    id: "products",
    title: "Produtos",
    icon: <Package className="size-4" />,
    link: "/products",
  },
  {
    id: "clients",
    title: "Clientes",
    icon: <Building2 className="size-4" />,
    link: "/clients",
  },
  {
    id: "suppliers",
    title: "Fornecedores",
    icon: <Truck className="size-4" />,
    link: "/suppliers",
  },
];

export function DashboardSidebar({ userName }: { userName: string }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const logout = useLogout();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            OG
          </span>
          {!isCollapsed && (
            <span className="font-semibold text-sidebar-foreground">Oba Green</span>
          )}
        </span>
        <div className={cn("flex items-center gap-1", isCollapsed && "flex-row md:flex-col-reverse")}>
          <ModeToggle />
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={navRoutes} />
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        {!isCollapsed && (
          <span className="px-2 pb-2 text-xs text-muted-foreground truncate">{userName}</span>
        )}
        <Button
          variant="ghost"
          className={cn("justify-start gap-2 text-muted-foreground hover:text-destructive", isCollapsed && "justify-center px-0")}
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
