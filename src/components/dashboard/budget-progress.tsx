"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import type { Budget } from "@/lib/demo-data";

interface BudgetProgressProps {
  budgets: Budget[];
}

export const BudgetProgress = React.memo(function BudgetProgress({ budgets }: BudgetProgressProps) {
  const { isPrivate } = usePrivacy();
  return (
    <Card className="bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl md:rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Presupuestos de Octubre</CardTitle>
          <CardDescription>Seguimiento de límites de gasto por categoría</CardDescription>
        </div>
        <Link
          href="/budgets"
          className="text-xs font-semibold text-[#0071e3] dark:text-[#2997ff] hover:text-[#0066cc] flex items-center gap-1 transition-colors"
        >
          <span>Ajustar</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgets.map((b) => {
            const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
            const isWarning = b.spent / b.limit >= b.warningThreshold;
            const isExceeded = b.spent > b.limit;
            const remaining = Math.max(0, b.limit - b.spent);

            return (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    <span>{b.category}</span>
                    {isWarning && (
                      <AlertTriangle className="h-3 w-3 text-[#FF9F0A] shrink-0" />
                    )}
                  </div>
                  <div className="text-[#6e6e73] dark:text-[#86868b] text-[11px]">
                    <span className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
                      {isPrivate ? "$••••••" : formatCurrency(b.spent)}
                    </span>{" "}
                    / {isPrivate ? "$••••••" : formatCurrency(b.limit)}
                  </div>
                </div>

                {/* Apple Progress bar */}
                <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/[0.08] overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? "bg-[#FF453A]"
                        : isWarning
                        ? "bg-[#FF9F0A]"
                        : "bg-[#0071e3] dark:bg-[#2997ff]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#6e6e73] dark:text-[#86868b]">
                  <span>{pct}% consumido</span>
                  <span>Quedan {isPrivate ? "$••••••" : formatCurrency(remaining)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
