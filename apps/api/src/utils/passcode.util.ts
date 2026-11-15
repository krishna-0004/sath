import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// 32 unambiguous characters (excludes 0, O, 1, I to avoid human transcription confusion)
const UNAMBIGUOUS_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Generates an unambiguous 10-character uppercase join code.
 */
export function generateJoinCode(length = 10): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, UNAMBIGUOUS_ALPHABET.length);
    result += UNAMBIGUOUS_ALPHABET[randomIndex];
  }
  return result;
}

/**
 * Hashes a profile passcode using bcrypt with cost factor 12.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, BCRYPT_SALT_ROUNDS);
}

/**
 * Securely verifies a candidate passcode against the bcrypt hash.
 */
export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}
