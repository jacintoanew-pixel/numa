"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";

interface CashflowSummaryProps {
  income: number;
  incomeChangePct: number;
  expenses: number;
  expensesChangePct: number;
  netSavings: number;
  savingsRatePct: number;
}

export const CashflowSummary = React.memo(function CashflowSummary({
  income,
  incomeChangePct,
  expenses,
  expensesChangePct,
  netSavings,
  savingsRatePct,
}: CashflowSummaryProps) {
  const { isPrivate } = usePrivacy();

  // Exact financial retention & expense ratios relative to monthly income
  const retentionPct =
    income > 0 ? Math.max(0, Math.min(100, ((income - expenses) / income) * 100)) : 0;
  const expensePct =
    income > 0 ? Math.max(0, Math.min(100, (expenses / income) * 100)) : 0;

  return (
    <Card className="p-4 sm:p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl md:rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
      {/* Group Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
            Rendimiento de Octubre
          </h3>
          <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
            Balance operativo del periodo
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0071e3]/10 dark:bg-[#2997ff]/15 text-[#0066CC] dark:text-[#2997ff] border border-[#0071e3]/20 dark:border-[#2997ff]/25 font-mono">
          Retención {savingsRatePct.toFixed(1)}%
        </span>
      </div>

      {/* Performance Grid (Ingresos, Gastos, Ahorro Neto) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Cell: Ingresos */}
        <div className="col-span-1 p-3.5 sm:p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] hover:bg-[#e8e8ed]/60 dark:hover:bg-[#2a2a2c] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#6e6e73] dark:text-[#86868b] truncate">
              <span className="h-2 w-2 rounded-full bg-[#28CD41] dark:bg-[#30D158] shrink-0" />
              <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Ingresos</span>
            </span>
            <span className="text-[11px] font-semibold text-[#1D8348] dark:text-[#30D158] shrink-0 font-mono">
              {formatPercentage(incomeChangePct)}
            </span>
          </div>
          <div className="mt-2 text-base sm:text-xl lg:text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums tracking-tight">
            {isPrivate ? "$••••••" : formatCurrency(income)}
          </div>
          <div className="mt-1 text-[11px] text-[#6e6e73] dark:text-[#86868b] truncate">
            vs. mes anterior
          </div>
        </div>

        {/* Cell: Gastos */}
        <div className="col-span-1 p-3.5 sm:p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] hover:bg-[#e8e8ed]/60 dark:hover:bg-[#2a2a2c] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#6e6e73] dark:text-[#86868b] truncate">
              <span className="h-2 w-2 rounded-full bg-[#FF453A] shrink-0" />
              <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Gastos</span>
            </span>
            <span className="text-[11px] font-semibold text-[#FF453A] shrink-0 font-mono">
              {expensePct.toFixed(0)}%
            </span>
          </div>
          <div className="mt-2 text-base sm:text-xl lg:text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums tracking-tight">
            {isPrivate ? "$••••••" : formatCurrency(expenses)}
          </div>
          <div className="mt-1 text-[11px] text-[#6e6e73] dark:text-[#86868b] truncate">
            de los ingresos
          </div>
        </div>

        {/* Cell: Ahorro Neto */}
        <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] hover:bg-[#e8e8ed]/60 dark:hover:bg-[#2a2a2c] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#6e6e73] dark:text-[#86868b] truncate">
              <span className="h-2 w-2 rounded-full bg-[#0071e3] dark:bg-[#2997ff] shrink-0" />
              <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Ahorro Neto</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold font-mono border ${
                netSavings >= 0
                  ? "bg-[#28CD41]/10 dark:bg-[#30D158]/15 text-[#1D8348] dark:text-[#30D158] border-[#28CD41]/20 dark:border-[#30D158]/25"
                  : "bg-[#FF453A]/10 dark:bg-[#FF453A]/15 text-[#D70015] dark:text-[#FF453A] border-[#FF453A]/20 dark:border-[#FF453A]/25"
              }`}
            >
              {netSavings >= 0 ? "Flujo Positivo" : "Déficit"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div
              className={`text-lg sm:text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${
                netSavings >= 0
                  ? "text-[#1D8348] dark:text-[#30D158]"
                  : "text-[#D70015] dark:text-[#FF453A]"
              }`}
            >
              {isPrivate ? "$••••••" : formatCurrency(netSavings)}
            </div>
            <span className="text-[11px] font-medium text-[#0066CC] dark:text-[#2997ff] sm:hidden font-mono">
              {retentionPct.toFixed(1)}% retenido
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#6e6e73] dark:text-[#86868b] truncate hidden sm:block">
            Meta sugerida: 20% a 30%
          </div>
        </div>
      </div>

      {/* Proportional Ratio Bar */}
      <div className="mt-4 pt-3 border-t border-[#e8e8ed] dark:border-white/[0.08]">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between text-[11px] text-[#6e6e73] dark:text-[#86868b] mb-1.5 font-medium gap-1">
          <span>Retención vs. Gastos sobre Ingresos</span>
          <span className="font-mono text-[#1d1d1f] dark:text-white/90">
            {retentionPct.toFixed(1)}% ahorro • {expensePct.toFixed(1)}% gastos
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/[0.08] overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-[#28CD41] dark:from-[#30D158] to-[#0071e3] dark:to-[#2997ff] rounded-full transition-all duration-500"
            style={{ width: `${retentionPct}%` }}
          />
        </div>
      </div>
    </Card>
  );
});
