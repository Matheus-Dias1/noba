import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { encryptPassword } from "@/lib/passwords";
import { User } from "@/models/user";
import type { SessionError } from "@/types";

/**
 * POST /api/users — create a new user.
 *
 * Ported from the original `resolvers/users.ts`. New users are created as
 * non-admin (so they cannot log in until an admin flips the flag — see
 * PAGES_EXTRACTION.md §10 #1). The original returned the raw Mongo duplicate-key
 * error as `USER_ALREADY_EXISTS`; we keep that contract.
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

    await connectDB();

    let hash: string;
    try {
      hash = await encryptPassword(password);
    } catch (err) {
      console.error(`Error trying to generate password hash: ${err}`);
      return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
    }

    const newUser = new User({
      username: username.trim().toLowerCase(),
      name,
      password: hash,
    });

    try {
      const saved = await newUser.save();
      return NextResponse.json({ id: String(saved._id) }, { status: 201 });
    } catch (err: unknown) {
      const error = err as { name?: string; code?: number };
      if (error.name === "MongoServerError" && error.code === 11000) {
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
