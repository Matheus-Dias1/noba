import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { createSession, clearSession } from "@/lib/auth";
import { checkPassword } from "@/lib/passwords";
import type { SessionError, SessionPayload } from "@/types";

/**
 * POST /api/session — login.
 *
 * Ported from Mongoose to Drizzle. Username is lowercased + trimmed; non-admin
 * users are rejected with INSUFFICIENT_PERMISSIONS (matches the original
 * behavior — only admins can log in). On success the JWT is set as an
 * httpOnly cookie via `createSession`.
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };

    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, (username ?? "").trim().toLowerCase()))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "USER_DOESNT_EXIST" satisfies SessionError },
        { status: 404 },
      );
    }
    if (!user[0].admin) {
      return NextResponse.json(
        { error: "INSUFFICIENT_PERMISSIONS" satisfies SessionError },
        { status: 403 },
      );
    }

    const match = await checkPassword(password ?? "", user[0].passwordHash);
    if (!match) {
      return NextResponse.json(
        { error: "WRONG_PASSWORD" satisfies SessionError },
        { status: 401 },
      );
    }

    const payload: SessionPayload = {
      sub: String(user[0].id),
      name: user[0].name,
      username: user[0].username,
      admin: user[0].admin,
    };
    await createSession(payload);

    return NextResponse.json({ token: "ok" });
  } catch (err) {
    console.log("UNEXPECTED ERROR (session):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}

/** DELETE /api/session — logout (clears the session cookie). */
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
