import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { encryptPassword } from "@/lib/passwords";
import type { SessionError } from "@/types";

/**
 * POST /api/users — create a new user.
 *
 * Ported from Mongoose to Drizzle. New users are created as non-admin (so they
 * cannot log in until an admin flips the flag). Duplicate-username is detected
 * via the unique constraint and surfaced as USER_ALREADY_EXISTS.
 */
export async function POST(req: NextRequest) {
  try {
    const { username, name, password } = (await req.json()) as {
      username?: string;
      name?: string;
      password?: string;
    };

    if (!username || !name || !password) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    let hash: string;
    try {
      hash = await encryptPassword(password);
    } catch (err) {
      console.error(`Error trying to generate password hash: ${err}`);
      return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
    }

    try {
      const [created] = await db
        .insert(users)
        .values({
          username: username.trim().toLowerCase(),
          name,
          passwordHash: hash,
        })
        .returning({ id: users.id });
      return NextResponse.json({ id: String(created.id) }, { status: 201 });
    } catch (err: unknown) {
      // Postgres unique-violation: SQLSTATE 23505
      const e = err as { code?: string };
      if (e.code === "23505") {
        return NextResponse.json(
          { error: "USER_ALREADY_EXISTS" satisfies SessionError },
          { status: 422 },
        );
      }
      throw err; // falls into the outer catch as a 422
    }
  } catch (err) {
    console.log("UNEXPECTED ERROR (users):", err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 422 });
  }
}
