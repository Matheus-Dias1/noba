import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { type NextResponse } from "next/server";
import type { SessionPayload } from "@/types";

/**
 * Auth helpers.
 *
 * Change vs. the original backend: the JWT lives in an **httpOnly cookie**
 * (`oba_session`) instead of being returned to the client and sent back via an
 * `Authorization: Bearer` header. This stops JS from reading the token (XSS
 * mitigation) while preserving the same server-side session semantics. The
 * cookie is same-origin, so client→API `fetch` calls in this app carry it
 * automatically with no extra headers.
 */

const COOKIE_NAME = "oba_session";
const TOKEN_SECRET = process.env.TOKEN_SECRET as string;
const EXPIRES_IN = "86400s"; // 24h — matches the original

if (!TOKEN_SECRET) {
  // Fail loudly during boot if the secret is missing rather than silently signing
  // with `undefined` (which the original middleware did).
  throw new Error("TOKEN_SECRET environment variable is required");
}

export const SESSION_COOKIE = COOKIE_NAME;

/** Sign a JWT containing the session payload and set it as an httpOnly cookie. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = jwt.sign(payload, TOKEN_SECRET, { expiresIn: EXPIRES_IN });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

/** Clear the session cookie (logout). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Read & verify the session from the cookie. Returns the decoded payload, or
 * `null` if there is no session or the token is invalid/expired.
 *
 * Server-only (uses `next/headers`).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, TOKEN_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Guard for API Route Handlers and server components.
 * Returns the session payload on success; on failure returns a 401 `NextResponse`
 * (for API routes) — callers use the `undefined` check to branch.
 */
export async function requireSession(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session || !session.admin) {
    const { NextResponse } = await import("next/server");
    return { ok: false, response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }
  return { ok: true, session };
}

/** Read the raw session cookie value off a `NextRequest` (for middleware). */
export function readSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, TOKEN_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
