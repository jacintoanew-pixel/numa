import { NextRequest, NextResponse } from "next/server";
import { financialService, type AccountRecord } from "@/lib/finance/service";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "bank",
  "savings",
  "checking",
  "wallet",
  "cash",
  "yappy",
  "card",
  "paypal",
  "investment",
  "credit",
]);

function normalizeAccountType(raw: string): AccountRecord["type"] {
  const clean = raw.toLowerCase().trim();
  if (clean === "cash") return "cash";
  if (clean === "credit" || clean === "card") return "credit";
  if (
    clean === "savings" ||
    clean === "wallet" ||
    clean === "yappy" ||
    clean === "paypal" ||
    clean === "investment"
  ) {
    return "savings";
  }
  return "bank";
}

/**
 * Validates and sanitizes account creation payload (POST / PATCH sync) to prevent XSS,
 * prototype pollution, unbounded numeric values or path manipulation.
 */
function sanitizeAccountInput(input: any) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const rawName = typeof input.name === "string" ? input.name : "";
  const name = rawName
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 80);
  if (!name) return null;

  const rawBalance = parseFloat(
    String(input.balance ?? input.currentBalance ?? "0.00").replace(/[^0-9.-]/g, "")
  );
  const balance = Number.isFinite(rawBalance)
    ? Math.min(Math.max(rawBalance, -100000000), 100000000)
    : 0;

  const masked =
    typeof input.accountNumberMasked === "string"
      ? input.accountNumberMasked.replace(/<[^>]*>?/gm, "").trim().slice(0, 30)
      : undefined;

  const currency =
    typeof input.currency === "string" && /^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())
      ? input.currency.trim().toUpperCase()
      : "USD";

  const color =
    typeof input.color === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input.color)
      ? input.color
      : "#0071E3";

  const logo =
    typeof input.logo === "string" &&
    /^\/[a-zA-Z0-9_\-./]+\.(png|jpg|jpeg|webp|svg)$/i.test(input.logo)
      ? input.logo.slice(0, 120)
      : undefined;

  const rawType = typeof input.type === "string" ? input.type.toLowerCase().trim() : "bank";
  const type = ALLOWED_TYPES.has(rawType) ? normalizeAccountType(rawType) : "bank";

  const subType: "savings" | "checking" | undefined =
    input.subType === "savings" || input.subType === "checking" ? input.subType : undefined;

  return {
    id:
      typeof input.id === "string" && /^[a-zA-Z0-9_-]{3,64}$/.test(input.id)
        ? input.id
        : undefined,
    name,
    type,
    currentBalance: balance.toFixed(2),
    currency,
    accountNumberMasked: masked,
    color,
    logo,
    subType,
  };
}

/**
 * N-04: Partial merge sanitizer for PUT /api/finance/accounts.
 * Only extracts fields explicitly present in the request body and NEVER resets
 * currentBalance or currency to defaults.
 */
function sanitizeAccountPatchInput(
  input: any
): Partial<Omit<AccountRecord, "id" | "userId">> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const updates: Partial<Omit<AccountRecord, "id" | "userId">> = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string") return null;
    const name = input.name
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 80);
    if (!name) return null;
    updates.name = name;
  }

  if (input.type !== undefined) {
    if (typeof input.type !== "string") return null;
    const rawType = input.type.toLowerCase().trim();
    if (!ALLOWED_TYPES.has(rawType)) return null;
    updates.type = normalizeAccountType(rawType);
  }

  if (input.accountNumberMasked !== undefined) {
    if (typeof input.accountNumberMasked === "string") {
      updates.accountNumberMasked = input.accountNumberMasked
        .replace(/<[^>]*>?/gm, "")
        .trim()
        .slice(0, 30);
    }
  }

  if (input.color !== undefined) {
    if (typeof input.color === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input.color)) {
      updates.color = input.color;
    }
  }

  if (input.logo !== undefined) {
    if (
      typeof input.logo === "string" &&
      /^\/[a-zA-Z0-9_\-./]+\.(png|jpg|jpeg|webp|svg)$/i.test(input.logo)
    ) {
      updates.logo = input.logo.slice(0, 120);
    }
  }

  if (input.subType === "savings" || input.subType === "checking") {
    updates.subType = input.subType;
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  return updates;
}

/**
 * GET /api/finance/accounts
 * Returns all active financial accounts for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // N-08 & R-01: Rate limit authenticated reads (60 req/min sliding window)
    const rate = checkRateLimit(`fin_read:${user.id}`, 60, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const accounts = financialService.getAccountsByUser(user.id);
    return NextResponse.json(
      {
        success: true,
        data: accounts,
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
      { error: "Error al obtener cuentas." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/accounts
 * Adds a new financial account or wallet for the authenticated user.
 */
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

    const rate = checkRateLimit(`fin_write:${user.id}`, 20, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    const sanitized = sanitizeAccountInput(body);
    if (!sanitized) {
      return NextResponse.json(
        { error: "Datos de cuenta no válidos. El nombre identificador es obligatorio." },
        { status: 400 }
      );
    }

    const created = financialService.addAccount(user.id, sanitized);

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al agregar cuenta." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/accounts?id=acc_xxx
 * Deletes a financial account or wallet for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`fin_write:${user.id}`, 20, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    let accountId = req.nextUrl.searchParams.get("id");
    if (!accountId) {
      const body = await req.json().catch(() => ({}));
      accountId = body?.id;
    }

    if (!accountId || typeof accountId !== "string" || !/^[a-zA-Z0-9_-]{3,64}$/.test(accountId)) {
      return NextResponse.json(
        { error: "El ID de la cuenta a eliminar es obligatorio y debe ser válido." },
        { status: 400 }
      );
    }

    const result = financialService.deleteAccount(user.id, accountId);
    if (!result.success) {
      return NextResponse.json(
        { error: "Cuenta no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Cuenta eliminada correctamente.",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar cuenta." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/accounts
 * Updates an existing account's metadata using partial merge (never resets balance or currency).
 */
export async function PUT(req: NextRequest) {
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

    const rate = checkRateLimit(`fin_write:${user.id}`, 20, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || !body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { error: "El ID de la cuenta es obligatorio." },
        { status: 400 }
      );
    }

    const sanitizedPatch = sanitizeAccountPatchInput(body);
    if (!sanitizedPatch) {
      return NextResponse.json(
        { error: "Datos de cuenta no válidos." },
        { status: 400 }
      );
    }

    const updated = financialService.updateAccount(user.id, body.id, sanitizedPatch);

    if (!updated) {
      return NextResponse.json(
        { error: "Cuenta no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar cuenta." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/finance/accounts
 * Bulk synchronizes accounts between client and server.
 */
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

    const rate = checkRateLimit(`fin_write:${user.id}`, 20, 60 * 1000, 0);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !Array.isArray(body.accounts)) {
      return NextResponse.json(
        { error: "Lista de cuentas requerida para sincronización masiva." },
        { status: 400 }
      );
    }

    const validAccounts = body.accounts
      .map((a: any) => sanitizeAccountInput(a))
      .filter((a: any): a is NonNullable<ReturnType<typeof sanitizeAccountInput>> => a !== null)
      .map((a: NonNullable<ReturnType<typeof sanitizeAccountInput>>) => ({
        ...a,
        id: a.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      }));

    const synced = financialService.syncUserAccounts(user.id, validAccounts);

    return NextResponse.json(
      {
        success: true,
        data: synced,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al sincronizar cuentas." },
      { status: 500 }
    );
  }
}
