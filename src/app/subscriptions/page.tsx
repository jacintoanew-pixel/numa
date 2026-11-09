"use client";

import * as React from "react";
import { Plus, X, Power, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  formatCurrency,
  formatShortDate,
  getDaysRemainingText,
  parseLocalDate,
} from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import {
  useFinancialStore,
  type ExtendedSubscription,
} from "@/components/providers/financial-store-provider";
import { toCents, fromCents } from "@/lib/finance/calculator";

export default function SubscriptionsPage() {
  const { subscriptions, addSubscription, toggleSubscription, deleteSubscription } =
    useFinancialStore();
  const { isPrivate } = usePrivacy();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [provider, setProvider] = React.useState("");
  const [category, setCategory] = React.useState("Software");
  const [amount, setAmount] = React.useState("");
  const [billingFrequency, setBillingFrequency] = React.useState<"monthly" | "yearly">("monthly");
  const [nextPaymentDate, setNextPaymentDate] = React.useState("2026-10-28");

  const activeSubscriptions = React.useMemo(
    () => subscriptions.filter((s) => s.isActive !== false),
    [subscriptions]
  );

  // Decimal-safe monthly & yearly totals (accounting for monthly vs yearly frequency)
  const { totalMonthly, totalYearly } = React.useMemo(() => {
    let monthlyCents = 0;
    for (const s of activeSubscriptions) {
      const c = toCents(s.amount);
      monthlyCents += s.billingFrequency === "yearly" ? Math.round(c / 12) : c;
    }
    const yearlyCents = monthlyCents * 12;
    return {
      totalMonthly: Number(fromCents(monthlyCents)),
      totalYearly: Number(fromCents(yearlyCents)),
    };
  }, [activeSubscriptions]);

  // Dynamically determine the next upcoming active subscription
  const nextUpcomingSub = React.useMemo(() => {
    if (activeSubscriptions.length === 0) return null;
    const sorted = [...activeSubscriptions].sort((a, b) => {
      const tA = parseLocalDate(a.nextPaymentDate).getTime();
      const tB = parseLocalDate(b.nextPaymentDate).getTime();
      return tA - tB;
    });
    return sorted[0];
  }, [activeSubscriptions]);

  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const colors = ["#0071e3", "#BF5AF2", "#28CD41", "#FF9F0A", "#FF453A", "#5E5CE6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newSub: ExtendedSubscription = {
      id: `sub-${Date.now()}`,
      name: name.trim(),
      provider: provider.trim() || name.trim(),
      category: category.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      currency: "USD",
      billingFrequency,
      nextPaymentDate: nextPaymentDate || "2026-11-01",
      status: "active",
      logoBg: randomColor,
      isActive: true,
    };

    addSubscription(newSub);
    setIsModalOpen(false);
    setName("");
    setProvider("");
    setAmount("");
    setBillingFrequency("monthly");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Suscripciones y Servicios
          </h2>
          <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b]">
            Control de pagos recurrentes, fechas de corte y costo proyectado anual.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="text-xs bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-full px-4"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Suscripción
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Card 1: Mensual Activo */}
        <Card className="col-span-1 p-3.5 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
              Mensual Activo
            </div>
            <div className="text-base sm:text-xl lg:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1.5 sm:mt-2 tabular-nums tracking-tight">
              {isPrivate ? "$••••••" : formatCurrency(totalMonthly)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
            {activeSubscriptions.length} servicios activos
          </div>
        </Card>

        {/* Card 2: Proyección Anual */}
        <Card className="col-span-1 p-3.5 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
              Proyección Anual
            </div>
            <div className="text-base sm:text-xl lg:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1.5 sm:mt-2 tabular-nums tracking-tight">
              {isPrivate ? "$••••••" : formatCurrency(totalYearly)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
            Gasto acumulado 12m
          </div>
        </Card>

        {/* Card 3: Próximo Cobro */}
        <Card className="col-span-2 sm:col-span-1 p-3.5 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
              Próximo Cobro
            </div>
            {nextUpcomingSub && (
              <span className="text-[11px] font-semibold text-[#0071e3] dark:text-[#2997ff] font-mono">
                {getDaysRemainingText(nextUpcomingSub.nextPaymentDate)}
              </span>
            )}
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between gap-2">
            <div className="text-sm sm:text-lg lg:text-xl font-bold text-[#0071e3] dark:text-[#2997ff]">
              {nextUpcomingSub
                ? `${nextUpcomingSub.name} (${formatShortDate(nextUpcomingSub.nextPaymentDate)})`
                : "Sin cobros activos"}
            </div>
            {nextUpcomingSub && (
              <div className="text-xs sm:text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
                {isPrivate ? "$••••••" : formatCurrency(nextUpcomingSub.amount, nextUpcomingSub.currency)}
              </div>
            )}
          </div>
          <div className="text-[11px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] mt-1 hidden sm:block">
            {nextUpcomingSub ? getDaysRemainingText(nextUpcomingSub.nextPaymentDate) : "Todo pausado"}
          </div>
        </Card>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subscriptions.map((sub) => {
          const isActive = sub.isActive !== false;
          return (
            <Card
              key={sub.id}
              className={`p-4 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] hover:border-[#d2d2d7] dark:hover:border-white/[0.18] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] transition-all group ${
                !isActive ? "opacity-65 bg-[#f5f5f7]/60 dark:bg-white/[0.02]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm shrink-0 mt-0.5"
                    style={{ backgroundColor: sub.logoBg }}
                  >
                    {sub.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug break-words">
                        {sub.name}
                      </h3>
                      <Badge variant={isActive ? "positive" : "neutral"} className="text-[10px] px-2 py-0.5 font-medium shrink-0">
                        {isActive ? "Activa" : "Pausada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1 leading-normal break-words">
                      {sub.provider} • {sub.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleSubscription(sub.id)}
                    title={isActive ? "Pausar suscripción" : "Reactivar suscripción"}
                    aria-label={isActive ? "Pausar suscripción" : "Reactivar suscripción"}
                    className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <Power
                      className={`h-4 w-4 ${
                        isActive ? "text-[#1D8348] dark:text-[#30D158]" : "text-[#6e6e73]"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSubscription(sub.id)}
                    title="Eliminar suscripción"
                    aria-label={`Eliminar ${sub.name}`}
                    className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#D70015] dark:text-[#86868b] dark:hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#e8e8ed] dark:border-white/[0.06] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#6e6e73] dark:text-[#86868b]">Próximo cargo: </span>
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#e5e5ea]">
                    {formatShortDate(sub.nextPaymentDate)}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
                  {isPrivate ? "$••••••" : formatCurrency(sub.amount, sub.currency)}{" "}
                  <span className="text-xs font-normal text-[#6e6e73] dark:text-[#86868b]">
                    / {sub.billingFrequency === "yearly" ? "año" : "mes"}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* New Subscription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Suscripción"
        description="Añade un servicio o pago recurrente para su proyección automática."
        maxWidth="md"
      >
        <form onSubmit={handleAddSubscription} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
              Nombre del Servicio
            </label>
            <input
              type="text"
              required
              placeholder="ej. Netflix, iCloud 2TB, ChatGPT Plus..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
                Proveedor / Empresa
              </label>
              <input
                type="text"
                placeholder="ej. Apple Inc, OpenAI..."
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
                Categoría
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val)}
                modalTitle="Categoría de Suscripción"
                aria-label="Categoría"
                options={[
                  { value: "Software", label: "Software" },
                  { value: "Entretenimiento", label: "Entretenimiento" },
                  { value: "Telefonía e Internet", label: "Telefonía e Internet" },
                  { value: "Productividad", label: "Productividad" },
                  { value: "Cloud y Servidores", label: "Cloud y Servidores" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
                Tarifa (USD $)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="19.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
                Ciclo
              </label>
              <CustomSelect
                value={billingFrequency}
                onChange={(val) => setBillingFrequency(val as "monthly" | "yearly")}
                modalTitle="Ciclo de Facturación"
                aria-label="Ciclo"
                options={[
                  { value: "monthly", label: "Mensual" },
                  { value: "yearly", label: "Anual" },
                ]}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
                Próximo Cobro
              </label>
              <input
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 tabular-nums"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="text-xs bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-full px-4"
            >
              Guardar Suscripción
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
