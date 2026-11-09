"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useTheme } from "@/components/theme/theme-provider";
import type { CashflowPoint } from "@/lib/demo-data";

interface SpendingChartProps {
  data: CashflowPoint[];
}

export const SpendingChart = React.memo(function SpendingChart({ data }: SpendingChartProps) {
  const { isPrivate } = usePrivacy();
  const { theme } = useTheme();
  const [selectedIdx, setSelectedIdx] = React.useState<number>(() => Math.max(0, data.length - 1));

  // Keep selectedIdx valid if data length changes
  React.useEffect(() => {
    if (selectedIdx >= data.length) {
      setSelectedIdx(Math.max(0, data.length - 1));
    }
  }, [data.length, selectedIdx]);

  const hasMovements = React.useMemo(() => {
    return data.length > 0 && data.some((d) => (d.ingresos || 0) > 0 || (d.gastos || 0) > 0);
  }, [data]);

  const activeMonth = data[selectedIdx] || data[data.length - 1];
  const isDark = theme === "dark";

  return (
    <Card className="bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl md:rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle>Flujo de Caja Semestral</CardTitle>
          <CardDescription>Comparativa mensual de ingresos vs. gastos</CardDescription>
        </div>
        {hasMovements && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#28CD41] dark:bg-[#30D158] inline-block shadow-[0_0_8px_rgba(48,209,88,0.4)]" />
              <span className="text-[#424245] dark:text-[#86868b] font-medium">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6e6e73] dark:bg-[#86868b] inline-block" />
              <span className="text-[#424245] dark:text-[#86868b] font-medium">Gastos</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {!hasMovements ? (
          <div className="h-[240px] sm:h-[265px] w-full flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-[#e8e8ed] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#202022]/60">
            <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 dark:bg-[#2997ff]/10 flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6 text-[#0071e3] dark:text-[#2997ff]" />
            </div>
            <h4 className="font-semibold text-sm text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
              Flujo semestral sin movimientos
            </h4>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] max-w-sm leading-relaxed">
              Esta gráfica se irá actualizando automáticamente conforme registres tus ingresos y gastos vía Telegram o de forma manual en la aplicación.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[240px] sm:h-[265px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#a1a1a6" : "#6e6e73", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#a1a1a6" : "#6e6e73", fontSize: 11 }}
                    domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 100)]}
                    allowDecimals={false}
                    tickFormatter={(val) => (isPrivate ? "$•••" : `$${val}`)}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const inc = (payload[0]?.value as number) || 0;
                        const exp = (payload[1]?.value as number) || 0;
                        const net = inc - exp;
                        return (
                          <div className="rounded-2xl border border-[#e8e8ed] dark:border-white/10 bg-white dark:bg-[#272729] p-3.5 shadow-xl backdrop-blur-2xl text-xs text-[#1d1d1f] dark:text-[#f5f5f7]">
                            <div className="font-semibold mb-2 flex items-center justify-between gap-3">
                              <span>{label} 2026</span>
                              <span className="text-[10px] text-[#6e6e73] dark:text-[#86868b]">Cierre mensual</span>
                            </div>
                            <div className="flex items-center justify-between gap-5 text-[#1D8348] dark:text-[#30D158] font-medium">
                              <span>Ingresos:</span>
                              <span className="tabular-nums font-bold">
                                {isPrivate ? "$••••••" : formatCurrency(inc)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-5 text-[#6e6e73] dark:text-[#86868b] font-medium mt-1">
                              <span>Gastos:</span>
                              <span className="tabular-nums font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                                {isPrivate ? "$••••••" : formatCurrency(exp)}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#e8e8ed] dark:border-white/10 flex items-center justify-between gap-5 text-[#0071e3] dark:text-[#2997ff] font-semibold">
                              <span>Ahorro neto:</span>
                              <span
                                className={`tabular-nums font-bold ${
                                  net >= 0
                                    ? "text-[#1D8348] dark:text-[#30D158]"
                                    : "text-[#D70015] dark:text-[#FF453A]"
                                }`}
                              >
                                {isPrivate ? "$••••••" : formatCurrency(net)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="ingresos"
                    fill={isDark ? "#30D158" : "#28CD41"}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    animationDuration={300}
                  />
                  <Bar
                    dataKey="gastos"
                    fill={isDark ? "#86868b" : "#6e6e73"}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    opacity={isDark ? 0.65 : 0.75}
                    animationDuration={300}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Month Pills + Selected Month Detail Bar */}
            <div className="mt-3 pt-3 border-t border-[#e8e8ed] dark:border-white/[0.08] space-y-2.5">
              <div className="grid grid-cols-6 gap-1.5">
                {data.map((item, index) => {
                  const isSelected = index === selectedIdx;
                  return (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() => setSelectedIdx(index)}
                      className={`py-1.5 px-1 rounded-lg text-center font-mono text-[11px] transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0071e3] text-white dark:bg-white dark:text-[#1d1d1f] font-bold shadow-xs"
                          : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {item.month.slice(0, 3).toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {activeMonth && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] text-[11px]">
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Detalle {activeMonth.month} 2026:
                  </span>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-[#6e6e73] dark:text-[#86868b]">
                      Ingresos:{" "}
                      <strong className="text-[#1D8348] dark:text-[#30D158]">
                        {isPrivate ? "$••••" : formatCurrency(activeMonth.ingresos)}
                      </strong>
                    </span>
                    <span className="text-[#6e6e73] dark:text-[#86868b]">
                      Gastos:{" "}
                      <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {isPrivate ? "$••••" : formatCurrency(activeMonth.gastos)}
                      </strong>
                    </span>
                    <span className="text-[#6e6e73] dark:text-[#86868b]">
                      Ahorro:{" "}
                      <strong className="text-[#0066CC] dark:text-[#2997ff]">
                        {isPrivate ? "$••••" : formatCurrency(activeMonth.ingresos - activeMonth.gastos)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
