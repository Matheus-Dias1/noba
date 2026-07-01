import bcrypt from "bcryptjs";

/**
 * Password hashing — ported from the original backend, updated to bcryptjs v3's
 * promise-based API (v3 returns promises by default; the old callback API is
 * deprecated).
 */
const SALT_ROUNDS = 10;

export const encryptPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);

export const checkPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);
