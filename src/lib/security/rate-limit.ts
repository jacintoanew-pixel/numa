import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
  lockedUntil: number;
}

const globalForRateLimit = globalThis as unknown as {
  __numaRateLimitStore?: Map<string, RateLimitEntry>;
};

const rateLimitStore =
  globalForRateLimit.__numaRateLimitStore ??
  (globalForRateLimit.__numaRateLimitStore = new Map<string, RateLimitEntry>());

/**
 * Extracts client IP safely from request headers.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks and records a request against a sliding window rate limit + lockout.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockoutMs = windowMs
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [], lockedUntil: 0 };

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      limit: maxAttempts,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
    };
  }

  // Prune timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    if (lockoutMs > 0) {
      entry.lockedUntil = now + lockoutMs;
      rateLimitStore.set(key, entry);
      return {
        allowed: false,
        limit: maxAttempts,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(lockoutMs / 1000)),
      };
    }
    // Pure sliding window (no fixed lockout): wait until the oldest timestamp expires from windowMs
    const oldest = entry.timestamps[0] ?? now;
    const waitMs = Math.max(1000, oldest + windowMs - now);
    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      limit: maxAttempts,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);

  // Periodic cleanup
  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.lockedUntil <= now && v.timestamps.every((t) => now - t >= windowMs)) {
        rateLimitStore.delete(k);
      }
    }
  }

  return {
    allowed: true,
    limit: maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.timestamps.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Clears rate limit counters for a key after a successful authentication.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clears all rate limit state (useful for unit tests).
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Helper to build a standard 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(retryAfterSeconds: number, customMessage?: string): NextResponse {
  const defaultMsg =
    retryAfterSeconds < 60
      ? `Demasiadas solicitudes seguidas. Por favor espera ${retryAfterSeconds} segundos e intenta nuevamente.`
      : `Demasiados intentos seguidos. Por seguridad, intenta nuevamente en ${Math.ceil(
          retryAfterSeconds / 60
        )} minutos.`;
  return NextResponse.json(
    {
      error: customMessage || defaultMsg,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
