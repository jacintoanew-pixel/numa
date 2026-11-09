"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Plus,
  ArrowLeftRight,
  PieChart,
  CreditCard,
  Landmark,
  PiggyBank,
  Smartphone,
  Globe,
  Banknote,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { AccountModal } from "@/components/modals/account-modal";
import type { Account } from "@/lib/demo-data";

interface BalanceCardProps {
  totalBalance: number;
  changePct: number;
  accounts: Account[];
}

function getAccountIcon(acc: Account) {
  const lower = acc.name.toLowerCase();
  if (lower.includes("yappy")) return Smartphone;
  if (lower.includes("paypal")) return Globe;
  if (lower.includes("punto pago") || acc.type === "card") return CreditCard;
  if (lower.includes("efectivo") || acc.type === "cash") return Banknote;
  if (lower.includes("caja de ahorros") || acc.type === "savings") return PiggyBank;
  return Landmark;
}

function getAccountMeta(acc: Account) {
  const lower = acc.name.toLowerCase();
  if (acc.type === "savings" || lower.includes("ahorro")) {
    return { subtitle: "Cuenta de Ahorro" };
  }
  if (acc.type === "checking" || acc.type === "corriente" || lower.includes("corriente")) {
    return { subtitle: "Cuenta Corriente" };
  }
  if (lower.includes("yappy") || acc.type === "yappy") {
    return { subtitle: "Billetera Móvil" };
  }
  if (lower.includes("punto pago") || acc.type === "card") {
    return { subtitle: "Tarjeta Débito" };
  }
  if (lower.includes("paypal") || acc.type === "paypal") {
    return { subtitle: "Saldo Digital" };
  }
  if (lower.includes("efectivo") || acc.type === "cash") {
    return { subtitle: "Dinero Físico" };
  }
  return { subtitle: "Cuenta Conectada" };
}

export const BalanceCard = React.memo(function BalanceCard({
  totalBalance,
  changePct,
  accounts,
}: BalanceCardProps) {
  const { isPrivate, togglePrivacy } = usePrivacy();
  const { openTransactionModal } = useFinancialStore();
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const formatted = formatCurrency(totalBalance);
  const parts = formatted.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : "";

  return (
    <Card className="overflow-hidden bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] rounded-2xl md:rounded-[22px]">
      <div className="p-4 sm:p-5 lg:p-6">
        {/* Hero Balance Section */}
        <div className="space-y-2.5 sm:space-y-3">
          {/* Eyebrow */}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73] dark:text-[#86868b]">
            <button
              type="button"
              onClick={togglePrivacy}
              className="inline-flex items-center gap-1.5 hover:text-[#0071e3] dark:hover:text-[#2997ff] transition-colors group cursor-pointer"
              title={isPrivate ? "Mostrar saldo (Atajo: P)" : "Ocultar saldo por privacidad (Atajo: P)"}
            >
              <span>Patrimonio líquido disponible</span>
              {isPrivate ? (
                <EyeOff className="h-3.5 w-3.5 text-[#0071e3] dark:text-[#2997ff]" />
              ) : (
                <Eye className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
              )}
            </button>
            <span className="font-mono text-xs">
              {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
            </span>
          </div>

          {/* Main Figure with subtle cents */}
          <div className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl 2xl:text-5xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums flex items-baseline">
            {isPrivate ? (
              <span className="tracking-widest font-mono text-2xl sm:text-3xl md:text-4xl text-[#6e6e73] dark:text-[#86868b]">
                $••••••••
              </span>
            ) : (
              <>
                <span>{integerPart}</span>
                {decimalPart && (
                  <span className="text-lg sm:text-xl md:text-2xl lg:text-2xl 2xl:text-3xl font-medium text-[#6e6e73] dark:text-[#86868b] ml-0.5">
                    {decimalPart}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Meta Row: Delta pill & Sync indicator */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-[#30D158]/15 dark:bg-[#30D158]/20 text-[#1D8348] dark:text-[#30D158] border border-[#28CD41]/30 dark:border-[#30D158]/30 shadow-xs">
              <TrendingUp className="h-3 w-3" />
              <span>{formatPercentage(changePct)} este mes</span>
            </span>
            <span className="text-[11px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] font-normal">
              Sincronizado en tiempo real
            </span>
          </div>

          {/* Quick Actions (3 Action Chips with 0ms Modal Trigger) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-1.5 sm:pt-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => openTransactionModal("expense")}
              className="w-full h-9 sm:h-10 text-[11px] sm:text-xs font-semibold rounded-xl bg-[#0071e3] hover:bg-[#0066cc] text-white shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 transition-transform active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Registrar</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openTransactionModal("transfer")}
              className="w-full h-9 sm:h-10 text-[11px] sm:text-xs font-semibold rounded-xl bg-black/[0.04] dark:bg-[#262629] hover:bg-black/[0.07] dark:hover:bg-[#2a2a2c] border-[#e8e8ed] dark:border-white/[0.08] text-[#1d1d1f] dark:text-white flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 transition-transform active:scale-[0.98]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-[#0071e3] dark:text-[#2997ff] shrink-0" />
              <span>Transferir</span>
            </Button>

            <Link href="/budgets" className="w-full">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-9 sm:h-10 text-[11px] sm:text-xs font-semibold rounded-xl bg-black/[0.04] dark:bg-[#262629] hover:bg-black/[0.07] dark:hover:bg-[#2a2a2c] border-[#e8e8ed] dark:border-white/[0.08] text-[#1d1d1f] dark:text-white flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 transition-transform active:scale-[0.98]"
              >
                <PieChart className="h-3.5 w-3.5 text-[#BF5AF2] shrink-0" />
                <span>Límites</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Connected Accounts List */}
        <div id="cuentas" className="mt-5 pt-4 border-t border-[#e8e8ed] dark:border-white/[0.08] scroll-mt-24">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
              Cuentas Conectadas • Fondos Disponibles
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0071e3] dark:text-[#2997ff] hover:text-[#0066cc] dark:hover:text-[#2997ff]/80 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Gestionar cuentas</span>
              </button>
              <span className="text-[#6e6e73] dark:text-[#86868b]">•</span>
              <Link
                href="/reports"
                className="text-xs font-medium text-[#0071e3] dark:text-[#2997ff] hover:text-[#0066cc] dark:hover:text-[#2997ff]/80 transition-colors"
              >
                Ver reporte ›
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {accounts.map((acc) => {
              const Icon = getAccountIcon(acc);
              const meta = getAccountMeta(acc);
              const isNegative = acc.balance < 0;

              return (
                <div
                  key={acc.id}
                  id={`cuenta-${acc.id}`}
                  className="p-2.5 sm:p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#262629] hover:bg-[#e8e8ed]/60 dark:hover:bg-[#2a2a2c] border border-[#e8e8ed] dark:border-white/[0.06] hover:border-[#d2d2d7] dark:hover:border-white/[0.14] transition-all flex items-center justify-between gap-2.5 group scroll-mt-24"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white border border-[#e8e8ed] dark:border-white/20 flex items-center justify-center shrink-0 p-1 shadow-xs overflow-hidden group-hover:scale-105 transition-transform">
                      {acc.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={acc.logo}
                          alt={acc.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Icon className="h-4 w-4 text-[#1d1d1f]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] text-xs truncate" title={acc.name}>
                        {acc.name.split("—")[0].trim()}
                      </div>
                      <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] truncate mt-0.5">
                        {meta.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-1">
                    <div
                      className={`text-xs sm:text-sm font-bold tabular-nums ${
                        isNegative ? "text-[#D70015] dark:text-[#FF453A]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"
                      }`}
                    >
                      {isPrivate ? "$••••••" : formatCurrency(acc.balance, acc.currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </Card>
  );
});
