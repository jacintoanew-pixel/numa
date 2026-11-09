import { NextRequest } from "next/server";
import { authStore, StoredUser } from "./auth-store";

/**
 * Extracts and verifies the session token from HTTP-only cookie or Authorization header.
 * Returns the authenticated StoredUser, or null if unauthenticated/expired.
 * Never falls back to any default/master user when no valid session token is present (N-01).
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<StoredUser | null> {
  const cookieToken = req.cookies.get("vx_auth_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  const token = cookieToken || bearerToken;
  if (!token) return null;
  return authStore.getUserBySessionToken(token);
}
