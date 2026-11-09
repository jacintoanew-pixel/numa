import { NextRequest, NextResponse } from "next/server";
import { financialService } from "@/lib/finance/service";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // N-08 & R-01: Rate limit authenticated reads per user (60 req/min sliding window)
    const rate = checkRateLimit(`fin_read:${user.id}`, 60, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const state = financialService.getFullState(user.id);
    return NextResponse.json(
      {
        success: true,
        data: state,
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
      { error: "Error al obtener estado financiero." },
      { status: 500 }
    );
  }
}
