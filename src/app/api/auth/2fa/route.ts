import { NextRequest, NextResponse } from "next/server";
import { authStore } from "@/lib/auth/auth-store";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      enabled: Boolean(user.twoFactorEnabled),
      enrolled: Boolean(user.twoFactorEnrolled),
      enrolledAt: user.twoFactorEnrolledAt,
    });
  } catch {
    return NextResponse.json({ error: "Error al consultar estado 2FA." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`2fa_manage_ip:${ip}`, 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const action = (body as Record<string, unknown>).action;

    // 1. Iniciar vinculación de nuevo dispositivo (genera clave nueva y QR seguro bajo demanda en servidor)
    if (action === "start_setup") {
      if (user.twoFactorEnrolled) {
        return NextResponse.json(
          { error: "Ya tienes un autenticador 2FA activo en tu cuenta. Debes desvincular el actual primero." },
          { status: 400 }
        );
      }
      const { secret, qrUri } = await authStore.generateNew2FASecret(user.id);
      return NextResponse.json({
        success: true,
        secret,
        qrUri,
      });
    }

    // 2. Confirmar nuevo dispositivo con el código de 6 dígitos
    if (action === "confirm_setup") {
      const rawCode = (body as Record<string, unknown>).code;
      const code = typeof rawCode === "string" ? rawCode.trim() : "";
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "El código de seguridad debe tener exactamente 6 dígitos numéricos." },
          { status: 400 }
        );
      }

      const confirmed = await authStore.confirmNew2FASetup(user.id, code);
      if (!confirmed) {
        return NextResponse.json(
          { error: "Código 2FA incorrecto o expirado. Revisa la hora de tu aplicación." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Autenticador vinculado exitosamente.",
      });
    }

    // 3. Desvincular 2FA actual
    if (action === "unlink") {
      const unlinked = await authStore.unlink2FA(user.id);
      if (!unlinked) {
        return NextResponse.json({ error: "No se pudo desvincular 2FA." }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Dispositivo 2FA desvinculado correctamente.",
      });
    }

    // 4. Revocar otras sesiones activas en el servidor (H-01)
    if (action === "revoke_other_sessions") {
      const currentCookieToken = req.cookies.get("vx_auth_token")?.value;
      const revokedCount = await authStore.revokeOtherSessions(user.id, currentCookieToken);
      return NextResponse.json({
        success: true,
        revokedCount,
        message: "Otras sesiones activas revocadas en el servidor.",
      });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error en operación 2FA." }, { status: 500 });
  }
}
