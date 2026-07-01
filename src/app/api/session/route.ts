import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { createSession, clearSession } from "@/lib/auth";
import { checkPassword } from "@/lib/passwords";
import { User } from "@/models/user";
import type { SessionError, SessionPayload } from "@/types";

/**
 * POST /api/session — login.
 *
 * Ported from the original `resolvers/session.ts`. Username is lowercased +
 * trimmed; non-admin users are rejected with INSUFFICIENT_PERMISSIONS (matches
 * the original behavior — only admins can log in). On success the JWT is set as
 * an httpOnly cookie via `createSession` (changed from the original's
 * body-returned token).
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };

    await connectDB();

    const user = await User.findOne({
      username: (username ?? "").trim().toLowerCase(),
    });

    if (!user) {
      return NextResponse.json(
        { error: "USER_DOESNT_EXIST" satisfies SessionError },
        { status: 404 },
      );
    }
    if (!user.admin) {
      return NextResponse.json(
        { error: "INSUFFICIENT_PERMISSIONS" satisfies SessionError },
        { status: 403 },
      );
    }

    const match = await checkPassword(password ?? "", user.password);
    if (!match) {
      return NextResponse.json(
        { error: "WRONG_PASSWORD" satisfies SessionError },
        { status: 401 },
      );
    }

    const payload: SessionPayload = {
      sub: String(user._id),
      name: user.name,
      username: user.username,
      admin: user.admin,
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
