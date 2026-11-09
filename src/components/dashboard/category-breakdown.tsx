"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import type { CategoryExpense } from "@/lib/demo-data";

interface CategoryBreakdownProps {
  categories: CategoryExpense[];
  totalSpent: number;
}

export const CategoryBreakdown = React.memo(function CategoryBreakdown({
  categories,
  totalSpent,
}: CategoryBreakdownProps) {
  const { isPrivate } = usePrivacy();

  return (
    <Card className="bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl md:rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gastos por Categoría</CardTitle>
          <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#86868b]">
            Total:{" "}
            <span className="text-[#1d1d1f] dark:text-[#f5f5f7] font-bold tabular-nums">
              {isPrivate ? "$••••••" : formatCurrency(totalSpent)}
            </span>
          </span>
        </div>
        <CardDescription>Distribución porcentual de egresos de este mes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#86868b] dark:text-[#a1a1a6]">
            No hay gastos registrados este mes.
          </div>
        ) : (
          <>
            {/* Multi-segment stacked bar */}
            <div className="h-2.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/[0.08] flex overflow-hidden p-0.5 gap-0.5">
              {categories.map((cat) => (
                <div
                  key={cat.category}
                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                  title={`${cat.category}: ${cat.percentage}%`}
                />
              ))}
            </div>

            {/* Detailed category list */}
            <div className="space-y-2 pt-1">
              {categories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between text-xs py-1.5 hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c] px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                      {cat.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[#6e6e73] dark:text-[#86868b] font-medium tabular-nums">
                      {cat.percentage}%
                    </span>
                    <span className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums min-w-[70px] text-right">
                      {isPrivate ? "$••••••" : formatCurrency(cat.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
