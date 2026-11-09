import { describe, it, expect } from "vitest";
import { formatTransactionsToCsv, formatReportSummaryToCsv } from "@/lib/finance/csv";

describe("CSV Financial Export Utility", () => {
  it("formats transactions array to RFC 4180 compliant CSV string", () => {
    const mockTxs = [
      {
        id: "tx-1",
        date: "2026-10-15T10:00:00.000Z",
        description: "Supermercado Riba Smith, San Francisco",
        type: "expense" as const,
        category: "Alimentación",
        account: "Banco General",
        amount: "145.50",
        status: "completed" as const,
      },
      {
        id: "tx-2",
        date: "2026-10-14T08:30:00.000Z",
        description: 'Honorarios "Desarrollo Web"',
        type: "income" as const,
        category: "Ingresos",
        account: "Banesco",
        amount: "1200.00",
        status: "completed" as const,
      },
    ];

    const csv = formatTransactionsToCsv(mockTxs);
    // O-05: Starts with UTF-8 BOM (\uFEFF) so Excel on Windows renders accents properly
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Fecha,Descripción,Tipo,Categoría,Cuenta,Monto USD,Estado");
    // Check quoting for commas and quotes
    expect(csv).toContain('"Supermercado Riba Smith, San Francisco"');
    expect(csv).toContain('""Desarrollo Web""');
    expect(csv).toContain("145.50");
    expect(csv).toContain("1200.00");
  });

  it("formats consolidated monthly report to CSV", () => {
    const summary = {
      period: "2026-10",
      totalIncome: "4200.00",
      totalExpenses: "1850.50",
      netSavings: "2349.50",
      savingsRatePct: 55.94,
      categories: [
        { name: "Vivienda", spent: "800.00", pct: 43.2 },
        { name: "Alimentación", spent: "450.50", pct: 24.3 },
      ],
    };

    const csv = formatReportSummaryToCsv(summary);
    expect(csv).toContain("Reporte Financiero Mensual");
    expect(csv).toContain("2026-10");
    expect(csv).toContain("Ingresos Totales,4200.00");
    expect(csv).toContain("Gastos Totales,1850.50");
    expect(csv).toContain("Ahorro Neto,2349.50");
    expect(csv).toContain("Vivienda,800.00");
  });
});
