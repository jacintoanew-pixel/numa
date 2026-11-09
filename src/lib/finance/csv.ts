/**
 * Financial CSV Export Formatter
 * 
 * Generates RFC 4180 compliant CSV streams for transactions and financial reports.
 */

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return "";
  let str = String(field);

  // Neutralize CSV Formula Injection (CWE-1236)
  if (/^[=+\-@\t\r%]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportableTransaction {
  id: string;
  date: string;
  description: string;
  type: "income" | "expense" | "transfer";
  category?: string;
  account?: string;
  amount: string;
  status: "completed" | "pending" | "cancelled";
}

export function formatTransactionsToCsv(transactions: ExportableTransaction[]): string {
  const headers = [
    "Fecha",
    "Descripción",
    "Tipo",
    "Categoría",
    "Cuenta",
    "Monto USD",
    "Estado",
  ];

  const rows = transactions.map((t) => [
    escapeCsvField(t.date),
    escapeCsvField(t.description),
    escapeCsvField(t.type),
    escapeCsvField(t.category || "General"),
    escapeCsvField(t.account || "Principal"),
    escapeCsvField(t.amount),
    escapeCsvField(t.status),
  ]);

  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

export interface ExportableReportSummary {
  period: string;
  totalIncome: string;
  totalExpenses: string;
  netSavings: string;
  savingsRatePct: number;
  categories: Array<{ name: string; spent: string; pct: number }>;
}

export function formatReportSummaryToCsv(summary: ExportableReportSummary): string {
  const lines: string[] = [
    `Reporte Financiero Mensual,${escapeCsvField(summary.period)}`,
    "",
    "Métrica,Monto USD",
    `Ingresos Totales,${escapeCsvField(summary.totalIncome)}`,
    `Gastos Totales,${escapeCsvField(summary.totalExpenses)}`,
    `Ahorro Neto,${escapeCsvField(summary.netSavings)}`,
    `Tasa de Ahorro,${summary.savingsRatePct}%`,
    "",
    "Categoría,Gasto USD,Porcentaje",
    ...summary.categories.map(
      (c) =>
        `${escapeCsvField(c.name)},${escapeCsvField(c.spent)},${c.pct}%`
    ),
  ];

  return "\uFEFF" + lines.join("\r\n");
}
