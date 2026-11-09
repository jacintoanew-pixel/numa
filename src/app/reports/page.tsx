"use client";

import * as React from "react";
import { Download, Printer, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { formatCurrency } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { useSecurity } from "@/components/providers/security-provider";

export default function ReportsPage() {
  const { cashflowTrends, categoryExpenses, metrics, accounts } = useFinancialStore();
  const { isPrivate } = usePrivacy();
  const { session } = useSecurity();

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportCsv = () => {
    const headers = ["Cuenta / Concepto", "Tipo", "Saldo / Monto", "Moneda"];
    const accountRows = accounts.map((acc) => [
      `"${acc.name.replace(/"/g, '""')}"`,
      acc.type,
      acc.balance.toFixed(2),
      acc.currency,
    ]);
    const metricRows = [
      ['"Patrimonio Total"', "KPI", metrics.totalBalance.toFixed(2), "USD"],
      ['"Ingresos del Mes"', "KPI", metrics.monthlyIncome.toFixed(2), "USD"],
      ['"Gastos del Mes"', "KPI", metrics.monthlyExpenses.toFixed(2), "USD"],
      ['"Ahorro Neto Real"', "KPI", metrics.netSavings.toFixed(2), "USD"],
    ];
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...accountRows.map((r) => r.join(",")), ...metricRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe_financiero_numa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Executive Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e8e8ed] dark:border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/numa-icon.png"
              alt="numa"
              className="h-10 w-10 object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                Informe Financiero Consolidado
              </h1>
              <Badge variant="outline" className="text-[10px] font-semibold">
                Octubre 2026
              </Badge>
            </div>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
              Titular: <span className="font-semibold text-[#1d1d1f] dark:text-[#e5e5ea]">{session?.name || "Usuario"}</span> • Acme • Moneda: USD ($)
            </p>
          </div>
        </div>

        {/* Interactive Action buttons (Hidden when generating PDF/printing) */}
        <div className="flex items-center gap-2 no-print self-end sm:self-center">
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={handleExportCsv}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="text-xs h-9 bg-[#0071e3] hover:bg-[#0066cc] text-white"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">Patrimonio Total</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(metrics.totalBalance)}
          </div>
          <span className="text-[11px] text-[#1D8348] dark:text-[#30D158] font-semibold">+{metrics.balanceChangePct}% este mes</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">Ingresos del Mes</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(metrics.monthlyIncome)}
          </div>
          <span className="text-[11px] text-[#1D8348] dark:text-[#30D158] font-semibold">+{metrics.incomeChangePct}% vs anterior</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">Gastos Totales</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(metrics.monthlyExpenses)}
          </div>
          <span className="text-[11px] text-[#1D8348] dark:text-[#30D158] font-semibold">{metrics.expensesChangePct}% de optimización</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">Ahorro Neto Real</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#1D8348] dark:text-[#30D158] mt-1 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(metrics.netSavings)}
          </div>
          <span className="text-[11px] text-[#6e6e73] dark:text-[#86868b] font-medium">Tasa de ahorro: {metrics.savingsRatePct}%</span>
        </Card>
      </div>

      {/* Cuentas Consolidadas con Logos Oficiales */}
      <Card className="p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
            Desglose de Cuentas y Liquidez
          </h3>
          <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
            Total: {isPrivate ? "$••••••" : formatCurrency(metrics.totalBalance)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex items-center justify-between gap-3 hover:bg-[#e8e8ed]/60 dark:hover:bg-[#2a2a2c] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-white border border-[#e8e8ed] dark:border-white/20 flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-0.5">
                  {acc.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={acc.logo} alt={acc.name} className="h-full w-full object-contain" />
                  ) : (
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </div>
                <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] text-xs truncate" title={acc.name}>
                  {acc.name}
                </span>
              </div>
              <span className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums shrink-0">
                {isPrivate ? "$••••••" : formatCurrency(acc.balance, acc.currency)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SpendingChart data={cashflowTrends} />
        </div>
        <div className="lg:col-span-4">
          <CategoryBreakdown categories={categoryExpenses} totalSpent={metrics.monthlyExpenses} />
        </div>
      </div>
    </div>
  );
}
