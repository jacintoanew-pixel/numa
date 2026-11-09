import { NextRequest, NextResponse } from "next/server";
import { authStore } from "@/lib/auth/auth-store";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const GENERIC_RECOVERY_MESSAGE =
  "Si el correo electrónico está registrado en nuestro sistema, recibirás las instrucciones y el enlace de recuperación en los próximos minutos.";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // H-02: Strict rate limiting on forgot-password endpoint
  const rate = checkRateLimit(`forgot_ip:${ip}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  try {
    const body = await req.json().catch(() => null);
    const email = body && typeof body === "object" ? (body as Record<string, unknown>).email : undefined;

    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 254) {
      return NextResponse.json(
        { error: "Ingresa un correo electrónico con formato válido." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

    // M-01: Prevent User Enumeration — always return 200 with identical message whether account exists or not
    try {
      const tokenEntry = await authStore.createPasswordResetToken(normalizedEmail);

      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

      console.log(
        `[AUTH-MAILER] Enlace de recuperación enviado a ${tokenEntry.email}: ${baseUrl}/login?reset_token=${tokenEntry.token} (Vence en 15 min)`
      );

      return NextResponse.json({
        success: true,
        message: GENERIC_RECOVERY_MESSAGE,
        ...(isTestEnv ? { token: tokenEntry.token, expiresAt: tokenEntry.expiresAt } : {}),
      });
    } catch {
      // Account does not exist — return the exact same 200 OK payload so attackers cannot enumerate emails
      return NextResponse.json({
        success: true,
        message: GENERIC_RECOVERY_MESSAGE,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }
}
