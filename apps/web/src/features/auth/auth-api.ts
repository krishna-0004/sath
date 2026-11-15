import { apiRequest } from "../../lib/api-client.js";
import type { AuthUser } from "./auth-types.js";

/**
 * Fetches the currently authenticated user profile.
 */
export async function getMe(): Promise<AuthUser> {
  const res = await apiRequest<{ user: AuthUser }>("/auth/me", {
    skipRedirectOnAuthFailure: true,
  });
  return res.user;
}

/**
 * Logs out the current session and invalidates the active refresh token.
 */
export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
  });
}

/**
 * Revokes all refresh tokens and sessions for the current user across all devices.
 */
export async function logoutAll(): Promise<void> {
  await apiRequest<void>("/auth/logout-all", {
    method: "POST",
  });
}

/**
 * Signs in as the fixed demo user when DEMO_LOGIN_ENABLED is enabled on the server.
 */
export async function demoLogin(): Promise<void> {
  await apiRequest<void>("/auth/demo", {
    method: "POST",
  });
}
