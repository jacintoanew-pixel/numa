import { NextRequest, NextResponse } from "next/server";
import { geminiAssistant } from "@/lib/gemini/client";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

    const rate = checkRateLimit(`assistant_chat:${user.id}`, 30, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Formato de consulta no válido." },
        { status: 400 }
      );
    }
    const { message, previousInteractionId } = body as Record<string, unknown>;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "El mensaje es requerido y no puede estar vacío" },
        { status: 400 }
      );
    }

    const response = await geminiAssistant.generateResponse({
      userId: user.id,
      message: message.trim().slice(0, 2000),
      previousInteractionId:
        typeof previousInteractionId === "string" ? previousInteractionId : undefined,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("Error in Assistant Chat API:", error);
    return NextResponse.json(
      {
        error: "Error interno al procesar la consulta con el asistente",
      },
      { status: 500 }
    );
  }
}
