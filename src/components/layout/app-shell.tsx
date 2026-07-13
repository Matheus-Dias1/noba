"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ShoppingCart, Package, LogOut, Building2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLogout } from "@/queries/session";
import { Loader2 } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Prefixes that mark this tab as active (covers sub-routes). */
  activePrefixes: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/batches",
    label: "Lotes",
    icon: Boxes,
    activePrefixes: ["/batches"],
  },
  {
    href: "/orders",
    label: "Pedidos",
    icon: ShoppingCart,
    activePrefixes: ["/orders"],
  },
  {
    href: "/products",
    label: "Produtos",
    icon: Package,
    activePrefixes: ["/products"],
  },
  {
    href: "/clients",
    label: "Clientes",
    icon: Building2,
    activePrefixes: ["/clients"],
  },
  {
    href: "/suppliers",
    label: "Fornecedores",
    icon: Truck,
    activePrefixes: ["/suppliers"],
  },
];

/**
 * App shell: icon-rail sidebar (matching the original's vertical nav) + main
 * content area. The sidebar highlights the active module and stays highlighted
 * on its sub-pages (list / new / detail / edit).
 */
export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const logout = useLogout();

  const isActive = (item: NavItem) =>
    item.activePrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed-height sidebar: never grows regardless of how tall the main
          content is. The main area handles its own scrolling. */}
      <aside className="flex h-screen w-16 shrink-0 flex-col border-r bg-sidebar py-4 md:w-60">
        <div className="px-4 pb-6 hidden md:block">
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            Oba Green
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-2 hidden md:block" />

        <div className="flex flex-col gap-1 px-2">
          {userName && (
            <span className="hidden truncate px-3 pb-2 text-xs text-muted-foreground md:inline">
              {userName}
            </span>
          )}
          <Button
            variant="ghost"
            className="justify-start gap-3 px-3 text-muted-foreground hover:text-destructive"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            title="Sair"
          >
            {logout.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <LogOut className="size-5" />
            )}
            <span className="hidden md:inline">Sair</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
