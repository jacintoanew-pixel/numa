import { NextRequest, NextResponse } from "next/server";
import {
  authStore,
  SESSION_MAX_AGE_SECONDS,
  validatePasswordPolicy,
} from "@/lib/auth/auth-store";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // H-02: Strict rate limiting on registration endpoint
  const rate = checkRateLimit(`register_ip:${ip}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  // H-03: Public registration is closed by default ("Crear Cuenta — Próximamente")
  const isPublicRegistrationEnabled = process.env.ALLOW_PUBLIC_REGISTRATION === "true";
  if (!isPublicRegistrationEnabled) {
    return NextResponse.json(
      {
        error: "La creación de nuevas cuentas estará disponible próximamente.",
        code: "FEATURE_UPCOMING",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Solicitud de registro inválida." },
        { status: 400 }
      );
    }

    const { name, email, password, username } = body as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 }
      );
    }

    // H-02: Unified 12-character password policy
    try {
      validatePasswordPolicy(password);
    } catch (policyErr: unknown) {
      return NextResponse.json(
        {
          error:
            policyErr instanceof Error
              ? policyErr.message
              : "La contraseña debe tener al menos 12 caracteres.",
        },
        { status: 400 }
      );
    }

    const rawIdentifier =
      typeof username === "string" && username.trim()
        ? username.trim()
        : typeof email === "string" && email.trim()
        ? email.trim()
        : "";

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Se requiere un nombre de usuario o correo electrónico." },
        { status: 400 }
      );
    }

    const isEmail = rawIdentifier.includes("@");
    const cleanEmail = isEmail ? rawIdentifier.toLowerCase() : "";
    const cleanUsername = isEmail
      ? rawIdentifier.split("@")[0].toLowerCase()
      : rawIdentifier.toLowerCase();

    // Register user with isVerified: false until email verification (H-03)
    const user = await authStore.registerWithEmail({
      name: name.trim(),
      email: cleanEmail,
      password: password as string,
      isVerified: false,
    });

    await authStore.updateUserProfile(user.id, { username: cleanUsername });
    user.username = cleanUsername;

    const session = authStore.createSession(
      user,
      ip,
      req.headers.get("user-agent") || undefined
    );

    // H-04: Never expose session.token in JSON body
    const response = NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
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
    const rawMsg = err instanceof Error ? err.message : "";
    const isDuplicate = rawMsg.includes("ya está registrado") || rawMsg.includes("en uso");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "No se pudo completar el registro con los datos proporcionados."
          : "Error al procesar la solicitud de registro.",
      },
      { status: 400 }
    );
  }
}
