import { NextRequest, NextResponse } from "next/server";
import { authStore, SESSION_MAX_AGE_SECONDS, getPublicAvatarUrl } from "@/lib/auth/auth-store";
import { getOTPAuthUri } from "@/lib/security/totp";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  resetRateLimit,
} from "@/lib/security/rate-limit";

const SAFE_AUTH_ERRORS = new Set([
  "Credenciales inválidas.",
  "Credenciales inválidas o usuario no registrado con contraseña.",
  "Código 2FA incorrecto o reutilizado (Anti-Replay activo).",
  "Código 2FA de vinculación incorrecto o expirado.",
]);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type no soportado. Usa application/json." },
        { status: 415 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Solicitud de inicio de sesión inválida." },
        { status: 400 }
      );
    }

    const { email, password, totpCode, action, userId, challengeId } = body as Record<
      string,
      unknown
    >;

    // =========================================================================
    // STEP 2: 2FA Verification (Requires valid short-lived challengeId from Step 1)
    // =========================================================================
    if (action === "verify_2fa") {
      const ipLimit = checkRateLimit(`2fa_ip:${ip}`, 8, 15 * 60 * 1000);
      if (!ipLimit.allowed) {
        return rateLimitResponse(ipLimit.retryAfterSeconds);
      }

      if (typeof totpCode !== "string" || !totpCode.trim()) {
        return NextResponse.json(
          { error: "Código 2FA requerido." },
          { status: 400 }
        );
      }

      if (typeof challengeId !== "string" || !challengeId.startsWith("ch_")) {
        return NextResponse.json(
          { error: "Sesión de desafío 2FA inválida o expirada. Inicia sesión nuevamente." },
          { status: 401 }
        );
      }

      const challengedUserId = authStore.getTwoFactorChallengeUser(challengeId);
      if (!challengedUserId || (typeof userId === "string" && userId && userId !== challengedUserId)) {
        return NextResponse.json(
          { error: "El desafío 2FA ha expirado o no es válido. Ingresa tu contraseña nuevamente." },
          { status: 401 }
        );
      }

      const user = await authStore.getUserById(challengedUserId);
      if (!user) {
        return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
      }

      const cleanTotp = totpCode.trim();
      if (!user.twoFactorEnrolled) {
        const enrolled = await authStore.confirm2FAEnrollment(user.id, cleanTotp);
        if (!enrolled) {
          authStore.recordTwoFactorChallengeFailure(challengeId);
          return NextResponse.json(
            { error: "Código 2FA de vinculación incorrecto o expirado. Verifica la hora de tu dispositivo." },
            { status: 401 }
          );
        }
      } else {
        const valid = authStore.verifyTOTP(user.id, cleanTotp);
        if (!valid) {
          authStore.recordTwoFactorChallengeFailure(challengeId);
          return NextResponse.json(
            { error: "Código 2FA incorrecto o reutilizado (Anti-Replay activo)." },
            { status: 401 }
          );
        }
      }

      // Challenge verified — consume single-use challengeId and reset rate limits
      authStore.consumeTwoFactorChallenge(challengeId);
      resetRateLimit(`2fa_ip:${ip}`);
      resetRateLimit(`login_ip:${ip}`);

      const session = authStore.createSession(user, ip, userAgent);

      const cleanEmail =
        user.email &&
        !user.email.endsWith("@numa.local") &&
        !user.email.endsWith("@example.com")
          ? user.email
          : "";

      // H-04: Do NOT include session.token in JSON response body; use HttpOnly cookie exclusively
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: cleanEmail,
          username:
            user.username ||
            (user.id === "usr_demo_user"
              ? "demouser"
              : user.id === "usr_master_01"
              ? "admin"
              : undefined),
          provider: user.provider,
          avatarUrl: getPublicAvatarUrl(user),
          isVerified: user.isVerified,
          preferredCurrency: user.preferredCurrency,
          biometricEnabled: user.biometricEnabled,
        },
      });

      response.cookies.set("vx_auth_token", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
      });

      return response;
    }

    // =========================================================================
    // STEP 1: Validate Credentials (Username / Email + Password)
    // =========================================================================
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return NextResponse.json(
        { error: "Correo electrónico / usuario y contraseña requeridos." },
        { status: 400 }
      );
    }

    const cleanIdentifier = email.trim().toLowerCase();

    // H-02: Enforce sliding-window rate limit per IP and per account identifier
    const ipRate = checkRateLimit(`login_ip:${ip}`, 8, 15 * 60 * 1000);
    if (!ipRate.allowed) {
      return rateLimitResponse(ipRate.retryAfterSeconds);
    }
    const acctRate = checkRateLimit(`login_acct:${cleanIdentifier}`, 5, 15 * 60 * 1000);
    if (!acctRate.allowed) {
      return rateLimitResponse(
        acctRate.retryAfterSeconds,
        "Cuenta bloqueada temporalmente tras múltiples intentos fallidos. Intenta de nuevo en 15 minutos."
      );
    }

    const user = await authStore.validateCredentials(cleanIdentifier, password);

    // Credentials valid: clear failed login rate limit for this identifier
    resetRateLimit(`login_acct:${cleanIdentifier}`);
    resetRateLimit(`login_ip:${ip}`);

    // H-01: If user has 2FA enabled and no TOTP code was provided, issue short-lived challengeId (no session cookie!)
    if (user.twoFactorEnabled && (typeof totpCode !== "string" || !totpCode.trim())) {
      const isEnrolled = Boolean(user.twoFactorEnrolled);
      const issuedChallengeId = authStore.createTwoFactorChallenge(user.id);
      const isTestEnv = Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";

      const qrUri =
        !isEnrolled && isTestEnv
          ? getOTPAuthUri(
              user.name || user.email,
              user.twoFactorSecret || "JBSWY3DPEHPK3PXP",
              "numa"
            )
          : undefined;

      return NextResponse.json({
        success: true,
        requires2FA: true,
        challengeId: issuedChallengeId,
        userId: user.id,
        email: user.email,
        name: user.name,
        enrolled: isEnrolled,
        // Only expose initial enrollment secret in unit test environment
        secret: !isEnrolled && isTestEnv ? user.twoFactorSecret : undefined,
        qrUri,
      });
    }

    // If 2FA code was provided inline with credentials
    if (user.twoFactorEnabled && typeof totpCode === "string" && totpCode.trim()) {
      const cleanTotp = totpCode.trim();
      if (!user.twoFactorEnrolled) {
        const enrolled = await authStore.confirm2FAEnrollment(user.id, cleanTotp);
        if (!enrolled) {
          return NextResponse.json(
            { error: "Código 2FA de vinculación incorrecto o expirado." },
            { status: 401 }
          );
        }
      } else {
        const valid = authStore.verifyTOTP(user.id, cleanTotp);
        if (!valid) {
          return NextResponse.json(
            { error: "Código 2FA incorrecto o reutilizado (Anti-Replay activo)." },
            { status: 401 }
          );
        }
      }
    }

    const session = authStore.createSession(user, ip, userAgent);

    const cleanEmail =
      user.email &&
      !user.email.endsWith("@numa.local") &&
      !user.email.endsWith("@example.com")
        ? user.email
        : "";

    // H-04: Never expose session.token in JSON response body
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: cleanEmail,
        username:
          user.username ||
          (user.id === "usr_demo_user"
            ? "demouser"
            : user.id === "usr_master_01"
            ? "admin"
            : undefined),
        provider: user.provider,
        avatarUrl: getPublicAvatarUrl(user),
        isVerified: user.isVerified,
        preferredCurrency: user.preferredCurrency,
        biometricEnabled: user.biometricEnabled,
      },
    });

    response.cookies.set("vx_auth_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    // M-04: Never leak internal TypeError/SyntaxError stack messages to the client
    const rawMsg = err instanceof Error ? err.message : "";
    const safeMessage = SAFE_AUTH_ERRORS.has(rawMsg)
      ? rawMsg
      : "Credenciales inválidas.";
    return NextResponse.json({ error: safeMessage }, { status: 401 });
  }
}
