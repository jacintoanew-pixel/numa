"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { toCents, fromCents } from "@/lib/finance/calculator";
import type { ExtendedSubscription } from "@/components/providers/financial-store-provider";

interface UpcomingSubscriptionsProps {
  subscriptions: ExtendedSubscription[];
}

export const UpcomingSubscriptions = React.memo(function UpcomingSubscriptions({
  subscriptions,
}: UpcomingSubscriptionsProps) {
  const { isPrivate } = usePrivacy();

  const activeSubs = React.useMemo(
    () => subscriptions.filter((s) => s.isActive !== false),
    [subscriptions]
  );

  const totalMonthlyCost = React.useMemo(() => {
    let cents = 0;
    for (const s of activeSubs) {
      const subCents = toCents(s.amount);
      cents += s.billingFrequency === "yearly" ? Math.round(subCents / 12) : subCents;
    }
    return Number(fromCents(cents));
  }, [activeSubs]);

  return (
    <Card className="bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl md:rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Suscripciones Activas</CardTitle>
          <CardDescription>
            Costo mensual estimado:{" "}
            <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
              {isPrivate ? "$••••••" : formatCurrency(totalMonthlyCost)}
            </span>
          </CardDescription>
        </div>
        <Link
          href="/subscriptions"
          className="text-xs font-semibold text-[#0071e3] dark:text-[#2997ff] hover:text-[#0066cc] flex items-center gap-1 transition-colors"
        >
          <span>Gestionar</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {activeSubs.map((sub) => (
            <div
              key={sub.id}
              className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex items-center justify-between hover:bg-[#e8e8ed]/60 dark:hover:bg-[#2a2a2c] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: sub.logoBg }}
                >
                  {sub.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight break-words">
                    {sub.name}
                  </div>
                  <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                    Próximo:{" "}
                    <span className="text-[#1d1d1f]/80 dark:text-[#a1a1a6] font-medium">
                      {formatShortDate(sub.nextPaymentDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                <div className="text-xs font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
                  {isPrivate ? "$••••••" : formatCurrency(sub.amount, sub.currency)}
                </div>
                <Badge variant="default" className="text-[9px] py-0 px-2 font-medium mt-0.5">
                  {sub.billingFrequency === "monthly" ? "Mensual" : "Anual"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
