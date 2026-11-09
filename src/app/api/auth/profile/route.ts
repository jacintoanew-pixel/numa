import { NextRequest, NextResponse } from "next/server";
import { authStore, getPublicAvatarUrl } from "@/lib/auth/auth-store";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

function isValidImageBase64DataUri(dataUri: string): boolean {
  const match = dataUri.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return false;
  try {
    const buf = Buffer.from(match[2], "base64");
    if (buf.length < 8) return false;
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return true;
    }
    // GIF: 47 49 46 38 ("GIF8")
    if (
      buf[0] === 0x47 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x38
    ) {
      return true;
    }
    // WebP: "RIFF" .... "WEBP"
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type no soportado. Usa application/json." },
        { status: 415 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`profile_write:${user.id}`, 30, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Formato de solicitud inválido." },
        { status: 400 }
      );
    }
    const { name, username, totpCode, avatarUrl } = body as Record<string, unknown>;

    const updates: { name?: string; username?: string; avatarUrl?: string } = {};

    if (avatarUrl !== undefined) {
      if (typeof avatarUrl === "string") {
        if (avatarUrl.length > 2 * 1024 * 1024) {
          return NextResponse.json(
            { error: "La imagen de perfil supera el tamaño máximo permitido (2MB)." },
            { status: 400 }
          );
        }
        if (avatarUrl.startsWith("/api/avatars/")) {
          // Already referencing server-stored avatar; keep existing data URI
        } else if (avatarUrl === "") {
          updates.avatarUrl = "";
        } else if (avatarUrl.startsWith("data:image/")) {
          if (!isValidImageBase64DataUri(avatarUrl)) {
            return NextResponse.json(
              { error: "Formato de imagen de perfil no válido. Usa JPEG, PNG, WebP o GIF." },
              { status: 400 }
            );
          }
          updates.avatarUrl = avatarUrl;
        } else if (
          /^\/[a-zA-Z0-9_\-./]+\.(png|jpg|jpeg|webp|gif)$/i.test(avatarUrl)
        ) {
          updates.avatarUrl = avatarUrl;
        } else {
          return NextResponse.json(
            { error: "Formato de imagen de perfil no válido." },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Formato de imagen de perfil no válido." },
          { status: 400 }
        );
      }
    }

    if (name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json(
          { error: "El nombre no puede estar vacío." },
          { status: 400 }
        );
      }
      const cleanName = name
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim()
        .slice(0, 80);
      if (!cleanName) {
        return NextResponse.json(
          { error: "El nombre no puede estar vacío." },
          { status: 400 }
        );
      }
      updates.name = cleanName;
    }

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return NextResponse.json(
          { error: "El nombre de usuario debe tener al menos 3 caracteres." },
          { status: 400 }
        );
      }
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: "El nombre de usuario solo puede contener letras, números, guiones y puntos." },
          { status: 400 }
        );
      }

      // Check if user has 2FA enabled / enrolled
      if (user.twoFactorEnrolled) {
        if (!totpCode || typeof totpCode !== "string") {
          return NextResponse.json(
            { error: "Para cambiar tu usuario se requiere autenticación en dos pasos (código de 6 dígitos)." },
            { status: 401 }
          );
        }
        const isValid = authStore.verifyTOTP(user.id, totpCode);
        if (!isValid) {
          return NextResponse.json(
            { error: "Código 2FA incorrecto o expirado. Introduce el código actual de tu aplicación autenticadora." },
            { status: 401 }
          );
        }
      }

      updates.username = cleanUsername;
    }

    if (!updates.name && !updates.username && updates.avatarUrl === undefined) {
      return NextResponse.json(
        { error: "No se proporcionaron cambios para actualizar." },
        { status: 400 }
      );
    }

    const updated = await authStore.updateUserProfile(user.id, updates);

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente.",
      user: {
        id: updated?.id,
        name: updated?.name,
        email: updated?.email,
        username: updated?.username,
        avatarUrl: getPublicAvatarUrl(updated),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar perfil.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
