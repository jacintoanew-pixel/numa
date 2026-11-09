"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Send,
  Globe,
  ExternalLink,
  ShoppingBag,
  Briefcase,
  Fuel,
  Cpu,
  Utensils,
  Home,
  HeartPulse,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import type { Transaction } from "@/lib/demo-data";

interface RecentTransactionsProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  showHeaderLink?: boolean;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Alimentación y Super":
    case "Restaurantes y Ocio":
      return Utensils;
    case "Ingresos Profesionales":
    case "Honorarios y Consultoría":
      return Briefcase;
    case "Transporte y Auto":
      return Fuel;
    case "Suscripciones y Software":
    case "Servicios y Software":
      return Cpu;
    case "Vivienda y Servicios":
    case "Servicios y Hogar":
      return Home;
    case "Salud y Bienestar":
      return HeartPulse;
    case "Entretenimiento y Ocio":
      return Sparkles;
    case "Transferencia Interna":
      return ArrowLeftRight;
    default:
      return ShoppingBag;
  }
}

export const RecentTransactions = React.memo(function RecentTransactions({
  transactions,
  onDelete,
  showHeaderLink = true,
}: RecentTransactionsProps) {
  const { isPrivate } = usePrivacy();

  return (
    <Card className="bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl md:rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos movimientos registrados por Web y Telegram</CardDescription>
        </div>
        {showHeaderLink && (
          <Link
            href="/transactions"
            className="text-xs font-semibold text-[#0071e3] dark:text-[#2997ff] hover:text-[#0066cc] flex items-center gap-1 transition-colors"
          >
            <span>Historial</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-[#e8e8ed] dark:divide-white/[0.06]">
          {transactions.map((tx) => {
            const Icon = getCategoryIcon(tx.category);
            const isIncome = tx.type === "income";
            const isTransfer = tx.type === "transfer";
            const isExpense = tx.type === "expense";
            const accountLabel =
              isTransfer && tx.toAccountName
                ? `${tx.accountName} → ${tx.toAccountName}`
                : tx.accountName;

            const shortAccountLabel =
              isTransfer && tx.toAccountName
                ? `${tx.accountName.split("—")[0].split("•")[0].trim()} → ${tx.toAccountName.split("—")[0].split("•")[0].trim()}`
                : tx.accountName.split("—")[0].split("•")[0].trim();

            return (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c] px-2 sm:px-2.5 rounded-xl transition-colors duration-150 group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1.5 sm:pr-2">
                  {/* Category Icon with Source Indicator */}
                  <div className="relative shrink-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                        isIncome
                          ? "bg-[#30D158]/15 border-[#28CD41]/30 dark:border-[#30D158]/25 text-[#1D8348] dark:text-[#30D158]"
                          : isTransfer
                          ? "bg-[#0071e3]/10 border-[#0071e3]/20 text-[#0071e3] dark:bg-[#0071e3]/20 dark:border-[#0071e3]/30 dark:text-[#2997ff]"
                          : "bg-black/[0.04] border-[#e8e8ed] text-[#1d1d1f] dark:bg-white/[0.06] dark:border-white/10 dark:text-[#f5f5f7]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {tx.source === "telegram" ? (
                      <span
                        className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#0088cc] text-white flex items-center justify-center ring-2 ring-white dark:ring-[#272729] shadow-xs"
                        title="Registrado vía Telegram"
                      >
                        <Send className="h-2 w-2" />
                      </span>
                    ) : (
                      <span
                        className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#8E8E93] text-white flex items-center justify-center ring-2 ring-white dark:ring-[#272729] shadow-xs"
                        title="Registrado vía Web"
                      >
                        <Globe className="h-2 w-2" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug truncate">
                      {tx.description}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#6e6e73] dark:text-[#86868b] min-w-0 overflow-hidden">
                      <span className="shrink-0">{formatShortDate(tx.date)}</span>
                      <span className="shrink-0 text-[#6e6e73]/60">•</span>
                      <span
                        className="font-medium text-[#1d1d1f]/80 dark:text-[#a1a1a6] truncate shrink min-w-0"
                        title={accountLabel}
                      >
                        {shortAccountLabel}
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 shrink-0">
                        <span className="text-[#6e6e73]/60">•</span>
                        {tx.source === "telegram" ? (
                          <span className="inline-flex items-center gap-0.5 text-[#0066CC] dark:text-[#2997ff] bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border border-[#0071e3]/20 dark:border-[#0071e3]/30 px-1.5 py-0.2 rounded-full text-[10px] font-medium">
                            <Send className="h-2.5 w-2.5" /> Telegram
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[#424245] dark:text-[#a1a1a6] bg-black/[0.04] dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/10 px-1.5 py-0.2 rounded-full text-[10px] font-medium">
                            <Globe className="h-2.5 w-2.5" /> Web
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap ${
                        isIncome
                          ? "text-[#1D8348] dark:text-[#30D158]"
                          : isTransfer
                          ? "text-[#0066CC] dark:text-[#2997ff]"
                          : "text-[#1d1d1f] dark:text-[#f5f5f7]"
                      }`}
                    >
                      {isPrivate
                        ? "$••••••"
                        : `${isIncome ? "+" : isExpense ? "-" : ""}${formatCurrency(tx.amount)}`}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#6e6e73] dark:text-[#86868b] truncate max-w-[95px] sm:max-w-[130px] text-right ml-auto">
                      {tx.category}
                    </div>
                  </div>

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(tx.id)}
                      title="Eliminar movimiento y revertir saldo"
                      aria-label={`Eliminar ${tx.description}`}
                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-[#6e6e73] hover:text-[#D70015] dark:text-[#86868b] dark:hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
