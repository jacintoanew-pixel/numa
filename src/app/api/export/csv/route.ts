import { NextRequest, NextResponse } from "next/server";
import { formatTransactionsToCsv, formatReportSummaryToCsv } from "@/lib/finance/csv";
import { financialService } from "@/lib/finance/service";
import { getAuthenticatedUser } from "@/lib/auth/server-session";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function getPanamaCurrentPeriod(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Panama",
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date())
      .slice(0, 7);
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Acceso no autorizado. Debe iniciar sesión." },
      { status: 401 }
    );
  }

  // R-01: Dedicated export rate limit (6 exports/min per user, sliding window)
  const rate = checkRateLimit(`fin_export:${user.id}`, 6, 60 * 1000, 0);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "transactions";
  const userId = user.id;
  const period = searchParams.get("period") || getPanamaCurrentPeriod();

  if (type === "transactions") {
    const rawTxs = financialService.getTransactionsByUser(userId);

    const transactionsToExport = rawTxs.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      type: t.type,
      category: "General",
      account: financialService.getAccount(t.accountId, userId)?.name || "Efectivo",
      amount: t.amount,
      status: t.status,
    }));

    const csvContent = formatTransactionsToCsv(transactionsToExport);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transacciones_${period}.csv"`,
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  }

  if (type === "reports") {
    const rawTxs = financialService.getTransactionsByUser(userId);
    const metrics = financialService.getConsolidatedMetrics(userId);

    const expenseTxs = rawTxs.filter((t) => t.type === "expense");
    const totalExpCents = expenseTxs.reduce(
      (acc, t) => acc + Math.round(parseFloat(t.amount || "0") * 100),
      0
    );

    const catMap = new Map<string, number>();
    for (const t of expenseTxs) {
      const cat = t.categoryId || "General";
      const amtCents = Math.round(parseFloat(t.amount || "0") * 100);
      catMap.set(cat, (catMap.get(cat) || 0) + amtCents);
    }

    const categories = Array.from(catMap.entries()).map(([name, cents]) => ({
      name,
      spent: (cents / 100).toFixed(2),
      pct: totalExpCents > 0 ? Number(((cents / totalExpCents) * 100).toFixed(1)) : 0,
    }));

    const summary = {
      period,
      totalIncome: metrics.totalIncome,
      totalExpenses: metrics.totalExpenses,
      netSavings: metrics.netSavings,
      savingsRatePct: metrics.savingsRatePct,
      categories,
    };

    const csvContent = formatReportSummaryToCsv(summary);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte_financiero_${period}.csv"`,
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  }

  return NextResponse.json({ error: "Tipo de exportación no soportado" }, { status: 400 });
}
