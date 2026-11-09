import { NextRequest, NextResponse } from "next/server";
import { authStore } from "@/lib/auth/auth-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]{3,64}$/.test(id)) {
      return NextResponse.json({ error: "Avatar no encontrado." }, { status: 404 });
    }

    const user = await authStore.getUserById(id);
    if (!user || !user.avatarUrl) {
      return NextResponse.json({ error: "Avatar no encontrado." }, { status: 404 });
    }

    const match = user.avatarUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Formato de avatar no soportado." }, { status: 404 });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Reject truncated/dummy headers (< 32 bytes) so client falls back cleanly to initials
    if (imageBuffer.byteLength < 32) {
      return NextResponse.json({ error: "Avatar vacío." }, { status: 404 });
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al cargar avatar." }, { status: 500 });
  }
}
