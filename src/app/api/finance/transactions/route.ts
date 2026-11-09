import { NextRequest, NextResponse } from "next/server";
import { financialService } from "@/lib/finance/service";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // N-07: Strictly require application/json Content-Type
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

    // N-08 & R-01: Rate limit authenticated write operations per user (20 req/min sliding window)
    const rate = checkRateLimit(`fin_write:${user.id}`, 20, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Datos del movimiento no válidos." },
        { status: 400 }
      );
    }

    const tx = await financialService.recordTransaction(user.id, body);
    const updatedState = financialService.getFullState(user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          transaction: tx,
          state: updatedState,
        },
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
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const msg = error instanceof Error ? error.message : "";

    // N-03: If account does not exist or belongs to another user, return 404
    if (statusCode === 404 || msg.includes("no encontrada")) {
      return NextResponse.json(
        { error: "Cuenta no encontrada." },
        { status: 404 }
      );
    }

    // N-05: Never expose internal Zod schema details/issues to the client
    return NextResponse.json(
      { error: "Datos del movimiento no válidos." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // N-08 & R-01: Rate limit authenticated write operations per user (20 req/min sliding window)
    const rate = checkRateLimit(`fin_write:${user.id}`, 20, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Se requiere el ID de la transacción a eliminar." },
        { status: 400 }
      );
    }

    const result = await financialService.deleteTransaction(user.id, id);
    if (!result.success) {
      return NextResponse.json(
        { error: "Transacción no encontrada o ya eliminada." },
        { status: 404 }
      );
    }

    const updatedState = financialService.getFullState(user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          deletedTx: result.deletedTx,
          state: updatedState,
        },
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
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar movimiento." },
      { status: 500 }
    );
  }
}
