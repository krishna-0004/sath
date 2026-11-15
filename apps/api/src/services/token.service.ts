import crypto from "node:crypto";
import * as jose from "jose";
import { env } from "../config/env.js";
import { TokenExpiredError, UnauthenticatedError } from "../errors/http-errors.js";

const JWT_ISSUER = "saath";
const JWT_AUDIENCE = "saath-web";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

export interface VerifiedAccessToken {
  userId: string;
  jti: string;
}

export interface GeneratedRefreshToken {
  raw: string;
  hash: string;
}

/**
 * Signs a short-lived access JWT (HS256) for a user.
 */
export async function signAccessToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  const secret = getSecretKey();

  return new jose.SignJWT({
    sub: userId,
    jti,
    typ: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifies an access token with algorithm strictly pinned to HS256.
 * Throws TokenExpiredError on expiration; UnauthenticatedError on any other failure.
 * Never includes token content in error messages.
 */
export async function verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
  try {
    const secret = getSecretKey();
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      throw new UnauthenticatedError("Invalid token subject");
    }

    if (!payload.jti || typeof payload.jti !== "string") {
      throw new UnauthenticatedError("Invalid token identifier");
    }

    if (payload["typ"] !== "access") {
      throw new UnauthenticatedError("Invalid token type");
    }

    return {
      userId: payload.sub,
      jti: payload.jti,
    };
  } catch (err: unknown) {
    if (err instanceof jose.errors.JWTExpired) {
      throw new TokenExpiredError("Access token expired");
    }
    if (err instanceof TokenExpiredError || err instanceof UnauthenticatedError) {
      throw err;
    }
    throw new UnauthenticatedError("Authentication verification failed");
  }
}

/**
 * Hashes a raw refresh token using SHA-256.
 */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Generates a cryptographically random 32-byte raw refresh token and its SHA-256 hash.
 */
export function generateRefreshToken(): GeneratedRefreshToken {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = hashToken(raw);
  return { raw, hash };
}
