import { NextRequest, NextResponse } from "next/server";
import { receiptScanner } from "@/lib/gemini/receipt-scanner";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB

function detectImageMimeByMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  // GIF: GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "image/gif";
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    if (
      !contentType.includes("multipart/form-data") &&
      !contentType.includes("application/json")
    ) {
      return NextResponse.json(
        { error: "Content-Type no soportado. Usa multipart/form-data o application/json." },
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

    // R-01: Rate limit AI receipt scanning to 5 req/min per user (sliding window)
    const rate = checkRateLimit(`fin_scan:${user.id}`, 5, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    let buffer: Buffer;
    let caption: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: "Formulario multipart inválido." },
          { status: 400 }
        );
      }
      const file = formData.get("file");
      const rawCaption = formData.get("caption");
      caption = typeof rawCaption === "string" ? rawCaption.slice(0, 500) : undefined;

      if (!file || typeof (file as File).arrayBuffer !== "function") {
        return NextResponse.json(
          { error: "No se proporcionó ningún archivo de imagen válido." },
          { status: 400 }
        );
      }

      const bytes = await (file as File).arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json(
          { error: "Solicitud inválida. Se requiere un cuerpo JSON con imageBase64." },
          { status: 400 }
        );
      }

      const rawBase64 = (body as Record<string, unknown>).imageBase64;
      if (typeof rawBase64 !== "string" || !rawBase64.trim()) {
        return NextResponse.json(
          { error: "Se requiere el campo imageBase64 con una imagen válida." },
          { status: 400 }
        );
      }

      const stripped = rawBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      buffer = Buffer.from(stripped, "base64");
      const rawCaption = (body as Record<string, unknown>).caption;
      caption = typeof rawCaption === "string" ? rawCaption.slice(0, 500) : undefined;
    }

    if (buffer.length === 0 || buffer.length > MAX_RECEIPT_BYTES) {
      return NextResponse.json(
        { error: "El tamaño de la imagen es inválido o excede el límite de 5MB." },
        { status: 400 }
      );
    }

    const detectedMime = detectImageMimeByMagicBytes(buffer);
    if (!detectedMime) {
      return NextResponse.json(
        { error: "El archivo enviado no es una imagen válida (solo se admiten JPEG, PNG o WebP)." },
        { status: 400 }
      );
    }

    const scanned = await receiptScanner.scanReceipt(buffer, detectedMime, caption);

    return NextResponse.json(
      {
        success: true,
        data: scanned,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in Receipt Scan API:", error);
    // M-04: Never expose internal stack or exception details to the client
    return NextResponse.json(
      {
        error: "Error al procesar la factura con IA.",
      },
      { status: 500 }
    );
  }
}
