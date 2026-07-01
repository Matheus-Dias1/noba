import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Protected area layout. Server-side auth guard: bounce to /login if there's no
 * valid admin session. The visual shell (sidebar) lives in `AppShell`.
 *
 * Note: middleware already protects these routes at the edge; this is the
 * defense-in-depth check on the server side.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.admin) redirect("/login");

  return <AppShell userName={session.name}>{children}</AppShell>;
}
