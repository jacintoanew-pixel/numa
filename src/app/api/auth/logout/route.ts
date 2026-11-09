import { NextRequest, NextResponse } from "next/server";
import { authStore } from "@/lib/auth/auth-store";

export async function POST(req: NextRequest) {
  // L-01: Verify Origin/Referer if present to prevent cross-site logout CSRF
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: "Origen de solicitud no autorizado." },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Cabecera Origin inválida." },
        { status: 400 }
      );
    }
  }

  const token = req.cookies.get("vx_auth_token")?.value;
  if (token) {
    try {
      authStore.revokeSession(token);
    } catch {}
  }

  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada correctamente",
  });

  // Explicitly wipe the HTTP-Only cookie across all domains and paths
  response.cookies.set("vx_auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

// L-01: Reject state-mutating GET logout requests with 405 Method Not Allowed
export async function GET() {
  return NextResponse.json(
    { error: "Método GET no permitido para cierre de sesión. Usa POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
