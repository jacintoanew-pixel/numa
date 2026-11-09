import { NextRequest, NextResponse } from "next/server";
import { authStore, SESSION_MAX_AGE_SECONDS, getPublicAvatarUrl } from "@/lib/auth/auth-store";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  issueWebAuthnChallenge,
  verifyWebAuthnAssertion,
} from "@/lib/auth/webauthn-server";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // N-01: Strictly require authenticated session; NEVER fallback to usr_master_01
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`bio_read:${authUser.id}`, 30, 60 * 1000);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const userId = authUser.id;
    const user = await authStore.getUserById(userId);
    const biometricEnabled = user ? user.biometricEnabled : false;
    const credentials = await authStore.getBiometricCredentials(userId);

    return NextResponse.json({
      success: true,
      userId,
      biometricEnabled,
      credentials,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al consultar estado biométrico." },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type no soportado. Usa application/json." },
        { status: 415 }
      );
    }

    const ip = getClientIp(req);
    const ipRate = checkRateLimit(`bio_post_ip:${ip}`, 20, 60 * 1000);
    if (!ipRate.allowed) {
      return rateLimitResponse(ipRate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Solicitud biométrica inválida." }, { status: 400 });
    }
    const {
      action,
      enabled,
      credentialId,
      publicKey,
      publicKeySpki,
      alg,
      deviceName,
      challengeToken,
      authenticatorData,
      clientDataJSON,
      signature,
    } = body as Record<string, unknown>;

    // Action -1: Issue a cryptographically signed single-use WebAuthn challenge
    if (action === "challenge") {
      const ch = issueWebAuthnChallenge();
      return NextResponse.json({
        success: true,
        challenge: ch.challenge,
        challengeToken: ch.challengeToken,
        expiresAt: ch.expiresAt,
      });
    }

    // Action 0: Public lookup of enrolled device owner profile for lock screen badge (no session/tokens exposed)
    if (action === "lookup_device") {
      if (!credentialId || typeof credentialId !== "string") {
        return NextResponse.json({ error: "credentialId requerido." }, { status: 400 });
      }
      const cred = await authStore.getBiometricCredentialById(credentialId);
      if (!cred || !cred.userId) {
        return NextResponse.json({ error: "Dispositivo no encontrado." }, { status: 404 });
      }
      const user = await authStore.getUserById(cred.userId);
      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
      }
      const resolvedUsername =
        user.username ||
        (user.id === "usr_master_01"
          ? "admin"
          : user.id === "usr_demo_user"
          ? "demouser"
          : user.name.toLowerCase().replace(/\s+/g, ""));

      return NextResponse.json({
        success: true,
        requiresReenroll: !cred.publicKeySpki,
        profile: {
          name: user.name,
          username: resolvedUsername,
          avatarUrl: getPublicAvatarUrl(user),
        },
      });
    }

    // Action 1: Cryptographic WebAuthn login verification using challenge + SPKI public key
    if (action === "verify_login") {
      if (!credentialId || typeof credentialId !== "string") {
        return NextResponse.json(
          { error: "Identificador de credencial biométrica requerido." },
          { status: 400 }
        );
      }

      const cred = await authStore.getBiometricCredentialById(credentialId);
      if (!cred || !cred.userId) {
        return NextResponse.json(
          {
            error: "Credencial biométrica no autorizada o dispositivo no vinculado.",
            code: "REENROLL_REQUIRED",
          },
          { status: 401 }
        );
      }

      // Reject legacy credentials that lack a real cryptographic SPKI public key
      if (!cred.publicKeySpki) {
        return NextResponse.json(
          {
            error:
              "Por actualización de seguridad WebAuthn, ingresa una vez con tu contraseña y código 2FA para revincular tu huella.",
            code: "REENROLL_REQUIRED",
          },
          { status: 401 }
        );
      }

      if (
        typeof challengeToken !== "string" ||
        typeof authenticatorData !== "string" ||
        typeof clientDataJSON !== "string" ||
        typeof signature !== "string"
      ) {
        return NextResponse.json(
          {
            error: "Faltan pruebas criptográficas WebAuthn (challenge, authenticatorData o firma).",
            code: "ASSERTION_REQUIRED",
          },
          { status: 401 }
        );
      }

      const hostHeader =
        req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        req.nextUrl.hostname ||
        "numa.example.com";
      const expectedRpId = hostHeader.split(":")[0];
      const originHeader = req.headers.get("origin") || undefined;

      const verification = verifyWebAuthnAssertion({
        challengeToken,
        authenticatorData,
        clientDataJSON,
        signature,
        publicKeySpki: cred.publicKeySpki,
        alg: cred.alg,
        previousSignCount: cred.signCount ?? 0,
        expectedRpId,
        expectedOrigin: originHeader,
      });

      if (!verification.verified) {
        return NextResponse.json(
          { error: verification.error || "Firma biométrica inválida." },
          { status: 401 }
        );
      }

      await authStore.updateBiometricSignCount(credentialId, verification.newSignCount);

      const user = await authStore.getUserById(cred.userId);
      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado." },
          { status: 404 }
        );
      }

      const userAgent = req.headers.get("user-agent") || "WebAuthn Device";
      const session = authStore.createSession(user, ip, userAgent);

      const res = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          avatarUrl: getPublicAvatarUrl(user),
          preferredCurrency: user.preferredCurrency,
          biometricEnabled: true,
        },
      });

      res.cookies.set("vx_auth_token", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return res;
    }

    // All other actions (register device, toggle) STRICTLY require active session with 2FA
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Debes iniciar sesión con tu usuario y código 2FA para vincular un nuevo dispositivo biométrico." },
        { status: 401 }
      );
    }
    const userId = authUser.id;

    if (action === "toggle") {
      const isEnabled = Boolean(enabled);
      await authStore.setBiometricEnabled(userId, isEnabled);
      return NextResponse.json({
        success: true,
        userId,
        biometricEnabled: isEnabled,
      });
    }

    if (action === "register" || (action !== "toggle" && credentialId)) {
      if (!credentialId || typeof credentialId !== "string") {
        return NextResponse.json(
          { error: "Identificador de credencial biométrica requerido." },
          { status: 400 }
        );
      }

      const resolvedSpki =
        typeof publicKeySpki === "string" && publicKeySpki.trim()
          ? publicKeySpki.trim()
          : undefined;
      if (!resolvedSpki) {
        return NextResponse.json(
          { error: "Clave pública criptográfica WebAuthn (SPKI) requerida para vincular huella." },
          { status: 400 }
        );
      }

      const credential = await authStore.saveBiometricCredential({
        userId,
        credentialId,
        publicKey: typeof publicKey === "string" ? publicKey : resolvedSpki,
        publicKeySpki: resolvedSpki,
        alg: typeof alg === "number" ? alg : -7,
        deviceName:
          typeof deviceName === "string"
            ? deviceName.slice(0, 80)
            : "Sensor de Huella Dactilar (Plataforma)",
      });

      await authStore.setBiometricEnabled(userId, true);

      return NextResponse.json({
        success: true,
        userId,
        biometricEnabled: true,
        credential,
      });
    }

    return NextResponse.json(
      { error: "Acción no reconocida (challenge, lookup_device, toggle, register o verify_login)." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Error al procesar biometría." }, { status: 400 });
  }
}
