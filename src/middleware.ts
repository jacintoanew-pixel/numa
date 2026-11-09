import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignedSessionTokenEdge } from "@/lib/security/session-signer";

function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://api.qrserver.com",
    "font-src 'self' data:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.telegram.org",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function applySecurityHeaders(
  res: NextResponse,
  cspHeader: string,
  isApi: boolean
): NextResponse {
  res.headers.set("X-XSS-Protection", "0");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Content-Security-Policy", cspHeader);
  if (isApi) {
    res.headers.set("Cache-Control", "no-store, max-age=0");
    res.headers.set("Pragma", "no-cache");
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const nonce = generateCspNonce();
  const cspHeader = buildCspHeader(nonce);

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host ||
    "numa.example.com";

  // =========================================================================
  // API Route Hardening (N-06 Cache-Control: no-store & N-07 Content-Type / Origin)
  // =========================================================================
  if (isApi) {
    const method = request.method.toUpperCase();
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const isTelegramWebhook = pathname.startsWith("/api/telegram/webhook");

    if (isMutating && !isTelegramWebhook) {
      // N-07: Validate Origin header if present on mutating requests
      const origin = request.headers.get("origin");
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          const isLocal =
            originHost.startsWith("localhost") || originHost.startsWith("127.0.0.1");
          if (originHost !== host && !isLocal) {
            return applySecurityHeaders(
              NextResponse.json(
                { error: "Origen no permitido." },
                { status: 403 }
              ),
              cspHeader,
              true
            );
          }
        } catch {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Cabecera Origin inválida." },
              { status: 403 }
            ),
            cspHeader,
            true
          );
        }
      }

      // N-07 & R-02: Require application/json on POST, PUT, PATCH (except empty-body /api/auth/logout,
      // and /api/finance/scan-receipt which accepts both multipart/form-data and application/json)
      const isLogout = pathname === "/api/auth/logout";
      const isScanReceipt = pathname === "/api/finance/scan-receipt";
      if (["POST", "PUT", "PATCH"].includes(method) && !isLogout) {
        const contentType = (request.headers.get("content-type") || "").toLowerCase();
        const isJson = contentType.includes("application/json");
        const isMultipartReceipt = isScanReceipt && contentType.includes("multipart/form-data");
        if (!isJson && !isMultipartReceipt) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Content-Type no soportado. Usa application/json." },
              { status: 415 }
            ),
            cspHeader,
            true
          );
        }
      }
    }

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-nonce", nonce);
    reqHeaders.set("Content-Security-Policy", cspHeader);
    const isAvatarRoute = pathname.startsWith("/api/avatars/");
    return applySecurityHeaders(
      NextResponse.next({ request: { headers: reqHeaders } }),
      cspHeader,
      !isAvatarRoute
    );
  }

  // =========================================================================
  // Page Route Authentication & Nonce Propagation
  // =========================================================================
  const token = request.cookies.get("vx_auth_token")?.value;
  const isLoginPage = pathname === "/login";
  const isLogoutRequested = searchParams.get("logout") === "true";

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("Content-Security-Policy", cspHeader);

  // If user explicitly logged out and landed on /login, clear cookie and stay on login
  if (isLoginPage && isLogoutRequested) {
    const res = applySecurityHeaders(
      NextResponse.next({ request: { headers: reqHeaders } }),
      cspHeader,
      false
    );
    res.cookies.set("vx_auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return res;
  }

  const isProtectedPath =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/budgets") ||
    pathname.startsWith("/subscriptions") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/assistant");

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  // Cryptographically verify HMAC-SHA256 signature and expiration of vx_auth_token (M-02)
  const isValidSession = await verifySignedSessionTokenEdge(token);

  // If user tries to access protected routes without a cryptographically valid session token, redirect to /login
  if (isProtectedPath && !isValidSession) {
    const loginUrl = new URL("/login", baseUrl);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    const redirectRes = applySecurityHeaders(
      NextResponse.redirect(loginUrl),
      cspHeader,
      false
    );
    if (token) {
      redirectRes.cookies.set("vx_auth_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
    return redirectRes;
  }

  // If user visits "/" with a valid session, redirect to /dashboard
  if (pathname === "/" && isValidSession) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", baseUrl)),
      cspHeader,
      false
    );
  }

  // If user is already authenticated with a valid session cookie and visits /login, redirect to /dashboard
  if (isLoginPage && isValidSession && !isLogoutRequested) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", baseUrl)),
      cspHeader,
      false
    );
  }

  const nextRes = applySecurityHeaders(
    NextResponse.next({ request: { headers: reqHeaders } }),
    cspHeader,
    false
  );
  if (isLoginPage && token && !isValidSession) {
    nextRes.cookies.set("vx_auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return nextRes;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/subscriptions/:path*",
    "/goals/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/assistant/:path*",
    "/login",
    "/api/:path*",
  ],
};
