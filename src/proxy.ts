import { type NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth";

/**
 * Route protection (edge proxy — Next 16 renamed `middleware.ts` to `proxy.ts`).
 *
 * - Public: /login, /api/session, /api/users (signup), and static assets.
 * - Everything else under / (including /batches, /orders, /products and the
 *   protected /api/* routes) requires a valid admin session cookie.
 *
 * Runs on the edge runtime; uses `readSessionFromRequest` (jwt.verify is edge-safe).
 */

const PUBLIC_PATHS = ["/login", "/api/session", "/api/users"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths through.
  if (isPublic(pathname)) return NextResponse.next();

  const session = readSessionFromRequest(req);
  if (!session || !session.admin) {
    // For API calls, return JSON 401; for pages, redirect to login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except static assets, Next internals, and favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
