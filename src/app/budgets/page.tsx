"use client";

import * as React from "react";
import { Plus, AlertTriangle, Sliders, X, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/custom-select";
import type { Budget } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { toCents, fromCents } from "@/lib/finance/calculator";

export default function BudgetsPage() {
  const { budgets, saveBudget, deleteBudget } = useFinancialStore();
  const { isPrivate } = usePrivacy();

  const [filter, setFilter] = React.useState<"all" | "warning" | "ok">("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);

  // Form states for New / Edit Budget
  const [formCategory, setFormCategory] = React.useState("");
  const [formLimit, setFormLimit] = React.useState("");
  const [formThreshold, setFormThreshold] = React.useState("0.8");

  const { totalLimit, totalSpent, remainingTotal, totalPct } = React.useMemo(() => {
    let limitCents = 0;
    let spentCents = 0;
    for (const b of budgets) {
      limitCents += toCents(b.limit);
      spentCents += toCents(b.spent);
    }
    const remCents = Math.max(0, limitCents - spentCents);
    const pct = limitCents > 0 ? Math.round((spentCents / limitCents) * 100) : 0;
    return {
      totalLimit: Number(fromCents(limitCents)),
      totalSpent: Number(fromCents(spentCents)),
      remainingTotal: Number(fromCents(remCents)),
      totalPct: pct,
    };
  }, [budgets]);

  const filteredBudgets = React.useMemo(() => {
    return budgets.filter((b) => {
      const ratio = b.limit > 0 ? b.spent / b.limit : 0;
      if (filter === "warning") return ratio >= b.warningThreshold;
      if (filter === "ok") return ratio < b.warningThreshold;
      return true;
    });
  }, [budgets, filter]);

  const openNewModal = () => {
    setEditingBudget(null);
    setFormCategory("");
    setFormLimit("");
    setFormThreshold("0.8");
    setIsModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormCategory(budget.category);
    setFormLimit(budget.limit.toString());
    setFormThreshold(budget.warningThreshold.toString());
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(formLimit);
    if (!formCategory.trim() || isNaN(limitNum) || limitNum <= 0) return;

    if (editingBudget) {
      saveBudget(
        {
          ...editingBudget,
          category: formCategory.trim(),
          limit: Math.round(limitNum * 100) / 100,
          warningThreshold: parseFloat(formThreshold) || 0.8,
        },
        true
      );
    } else {
      const newB: Budget = {
        id: `b-${Date.now()}`,
        category: formCategory.trim(),
        limit: Math.round(limitNum * 100) / 100,
        spent: 0,
        currency: "USD",
        warningThreshold: parseFloat(formThreshold) || 0.8,
        period: "Octubre 2026",
      };
      saveBudget(newB, false);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Presupuestos Mensuales
          </h2>
          <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b]">
            Control de topes máximos por categoría para evitar sobrecostos y maximizar el ahorro.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="text-xs bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-full px-4"
          onClick={openNewModal}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo Presupuesto
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="text-[10px] sm:text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider truncate">
            Límite Total
          </div>
          <div className="text-sm sm:text-xl lg:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 sm:mt-2 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(totalLimit)}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5 sm:mt-1 hidden xs:block truncate">
            {budgets.length} categorías activas
          </div>
        </Card>

        <Card className="p-3 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="text-[10px] sm:text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider truncate">
            Consumo
          </div>
          <div className="text-sm sm:text-xl lg:text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 sm:mt-2 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(totalSpent)}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5 sm:mt-1 hidden xs:block truncate">
            {totalPct}% consumido
          </div>
        </Card>

        <Card className="p-3 sm:p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="text-[10px] sm:text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider truncate">
            Margen Libre
          </div>
          <div className="text-sm sm:text-xl lg:text-2xl font-extrabold text-[#1D8348] dark:text-[#30D158] mt-1 sm:mt-2 tabular-nums">
            {isPrivate ? "$••••••" : formatCurrency(remainingTotal)}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5 sm:mt-1 hidden xs:block truncate">
            Disponible a fin de mes
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e8e8ed] dark:border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === "all"
              ? "bg-[#0071e3] text-white shadow-xs"
              : "bg-black/[0.04] dark:bg-white/[0.05] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          }`}
        >
          Todos ({budgets.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("warning")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === "warning"
              ? "bg-[#FF9F0A] text-[#1d1d1f] shadow-xs font-bold"
              : "bg-black/[0.04] dark:bg-white/[0.05] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          En Alerta / Límite
        </button>
        <button
          type="button"
          onClick={() => setFilter("ok")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === "ok"
              ? "bg-[#28CD41] dark:bg-[#30D158] text-[#1d1d1f] shadow-xs font-bold"
              : "bg-black/[0.04] dark:bg-white/[0.05] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          }`}
        >
          Bajo Control
        </button>
      </div>

      {/* Detailed Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBudgets.map((b) => {
          const pct = b.limit > 0 ? Math.min(100, Math.round((b.spent / b.limit) * 100)) : 0;
          const isWarning = b.limit > 0 && b.spent / b.limit >= b.warningThreshold;
          const isExceeded = b.spent > b.limit;
          const remaining = Number(fromCents(Math.max(0, toCents(b.limit) - toCents(b.spent))));

          return (
            <Card
              key={b.id}
              className="p-5 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-[#d2d2d7] dark:hover:border-white/[0.16]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {b.category}
                    </h3>
                    {isExceeded ? (
                      <Badge variant="negative" className="text-[10px] py-0.5 px-2">
                        Excedido
                      </Badge>
                    ) : isWarning ? (
                      <Badge variant="warning" className="text-[10px] py-0.5 px-2">
                        Alerta ({Math.round(b.warningThreshold * 100)}%)
                      </Badge>
                    ) : (
                      <Badge variant="positive" className="text-[10px] py-0.5 px-2">
                        Saludable
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                    Periodo: Mensual ({b.period})
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(b)}
                    className="text-xs h-7 px-2.5 rounded-full"
                  >
                    <Sliders className="h-3 w-3 mr-1" /> Ajustar
                  </Button>
                  <button
                    type="button"
                    onClick={() => deleteBudget(b.id)}
                    title="Eliminar presupuesto"
                    aria-label={`Eliminar presupuesto ${b.category}`}
                    className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#D70015] dark:text-[#86868b] dark:hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5 space-y-2">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#6e6e73] dark:text-[#86868b]">
                    Gastado:{" "}
                    <strong className="text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
                      {isPrivate ? "$••••••" : formatCurrency(b.spent)}
                    </strong>
                  </span>
                  <span className="text-[#6e6e73] dark:text-[#86868b]">
                    Límite:{" "}
                    <strong className="text-[#1d1d1f] dark:text-[#e5e5ea] tabular-nums">
                      {isPrivate ? "$••••••" : formatCurrency(b.limit)}
                    </strong>
                  </span>
                </div>

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

                <div className="flex items-center justify-between text-[11px] text-[#6e6e73] dark:text-[#86868b] pt-0.5">
                  <span className="font-medium">{pct}% consumido</span>
                  <span>
                    Margen restante:{" "}
                    <strong
                      className={
                        remaining === 0
                          ? "text-[#D70015] dark:text-[#FF453A]"
                          : "text-[#1D8348] dark:text-[#30D158]"
                      }
                    >
                      {isPrivate ? "$••••••" : formatCurrency(remaining)}
                    </strong>
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* New/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? "Ajustar Presupuesto" : "Nuevo Presupuesto"}
        description="Define el límite máximo asignado para este rubro mensual."
        maxWidth="md"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
              Nombre de Categoría
            </label>
            <input
              type="text"
              required
              placeholder="ej. Alimentación y Super, Entretenimiento..."
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
              Límite Mensual (USD $)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              placeholder="ej. 500.00"
              value={formLimit}
              onChange={(e) => setFormLimit(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">
              Umbral de Alerta Temprana
            </label>
            <CustomSelect
              value={formThreshold}
              onChange={(val) => setFormThreshold(val)}
              modalTitle="Umbral de Alerta Temprana"
              aria-label="Umbral de Alerta Temprana"
              options={[
                { value: "0.7", label: "Alerta al 70% consumido" },
                { value: "0.8", label: "Alerta al 80% consumido (Recomendado)" },
                { value: "0.85", label: "Alerta al 85% consumido" },
                { value: "0.9", label: "Alerta al 90% consumido" },
              ]}
            />
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
              {editingBudget ? "Guardar Cambios" : "Crear Presupuesto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
