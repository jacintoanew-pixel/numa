import { NextRequest, NextResponse } from "next/server";
import { authStore, validatePasswordPolicy } from "@/lib/auth/auth-store";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // H-02: Strict rate limiting on reset-password endpoint
  const rate = checkRateLimit(`reset_ip:${ip}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 }
      );
    }

    const { token, newPassword } = body as Record<string, unknown>;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { error: "Token de restablecimiento requerido." },
        { status: 400 }
      );
    }

    try {
      validatePasswordPolicy(newPassword);
    } catch (policyErr: unknown) {
      return NextResponse.json(
        {
          error:
            policyErr instanceof Error
              ? policyErr.message
              : "La nueva contraseña debe tener al menos 12 caracteres.",
        },
        { status: 400 }
      );
    }

    await authStore.resetPasswordWithToken(token.trim(), newPassword as string);

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente. Todas las sesiones activas han sido revocadas por seguridad.",
    });
  } catch {
    return NextResponse.json(
      { error: "El token de restablecimiento es inválido o ha expirado." },
      { status: 400 }
    );
  }
}
