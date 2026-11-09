"use client";

import * as React from "react";
import { Plus, Target, X, ArrowUpRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/custom-select";
import { type SavingsGoal } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import { toCents, fromCents } from "@/lib/finance/calculator";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useFinancialStore } from "@/components/providers/financial-store-provider";

export default function GoalsPage() {
  const { goals, accounts, addGoal, depositToGoal, deleteGoal } = useFinancialStore();
  const [isDepositModalOpen, setIsDepositModalOpen] = React.useState(false);
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = React.useState("");
  const [sourceAccountId, setSourceAccountId] = React.useState<string>("");
  const { isPrivate } = usePrivacy();

  // New goal form states
  const [newGoalName, setNewGoalName] = React.useState("");
  const [newGoalTarget, setNewGoalTarget] = React.useState("");
  const [newGoalDate, setNewGoalDate] = React.useState("");
  const [newGoalColor, setNewGoalColor] = React.useState("#0071e3");

  const { totalSaved, totalTarget, overallPct } = React.useMemo(() => {
    const savedCents = goals.reduce((acc, g) => acc + toCents(g.currentAmount), 0);
    const targetCents = goals.reduce((acc, g) => acc + toCents(g.targetAmount), 0);
    const saved = Number(fromCents(savedCents));
    const target = Number(fromCents(targetCents));
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    return { totalSaved: saved, totalTarget: target, overallPct: pct };
  }, [goals]);

  const openDeposit = (goal: SavingsGoal) => {
    setActiveGoal(goal);
    setDepositAmount("");
    setSourceAccountId("");
    setIsDepositModalOpen(true);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    depositToGoal(activeGoal.id, amountNum, sourceAccountId || undefined);
    setIsDepositModalOpen(false);
  };

  const handleNewGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(newGoalTarget);
    if (!newGoalName.trim() || isNaN(targetNum) || targetNum <= 0) return;

    addGoal({
      id: `goal-${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: targetNum,
      currentAmount: 0,
      currency: "USD",
      targetDate: newGoalDate.trim() || "Diciembre 2027",
      color: newGoalColor,
    });

    setIsNewGoalModalOpen(false);
    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Metas de Ahorro
          </h2>
          <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b]">
            Objetivos financieros planificados con seguimiento determinista de avance.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="text-xs bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-full px-4"
          onClick={() => setIsNewGoalModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nueva Meta
        </Button>
      </div>

      {/* Global Progress Card */}
      <Card className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider">
              Progreso Patrimonial Acumulado
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 tabular-nums">
              {isPrivate ? "$••••••" : formatCurrency(totalSaved)}{" "}
              <span className="text-sm font-normal text-[#6e6e73] dark:text-[#86868b]">
                / {isPrivate ? "$••••••" : formatCurrency(totalTarget)}
              </span>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0071e3] dark:text-[#2997ff] tabular-nums">
              {overallPct}%
            </span>
            <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">Avance general consolidado</div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 h-2.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/[0.08] overflow-hidden p-[1px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0071e3] to-[#30D158] transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </Card>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
          const remaining = Math.max(0, Number(fromCents(toCents(goal.targetAmount) - toCents(goal.currentAmount))));
          const isCompleted = goal.currentAmount >= goal.targetAmount;

          return (
            <Card
              key={goal.id}
              className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-[#d2d2d7] dark:hover:border-white/[0.16] group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: goal.color }}
                  >
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{goal.name}</h3>
                    <p className="text-xs text-[#6e6e73] dark:text-[#86868b] truncate">Fecha objetivo: {goal.targetDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCompleted ? (
                    <Badge variant="positive" className="text-xs">
                      ¡Completada! 🎉
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      {pct}%
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteGoal(goal.id)}
                    title="Eliminar meta"
                    className="p-1.5 rounded-lg text-[#6e6e73] dark:text-[#86868b] hover:text-[#D70015] dark:hover:text-[#FF453A] hover:bg-[#FF453A]/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] tabular-nums">
                    {isPrivate ? "$••••••" : formatCurrency(goal.currentAmount)}
                  </span>
                  <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                    Objetivo:{" "}
                    <span className="font-semibold text-[#1d1d1f] dark:text-[#e5e5ea] tabular-nums">
                      {isPrivate ? "$••••••" : formatCurrency(goal.targetAmount)}
                    </span>
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/[0.08] overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: goal.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#6e6e73] dark:text-[#86868b] pt-1">
                  <span>
                    {isCompleted ? (
                      <strong className="text-[#1D8348] dark:text-[#30D158]">Meta superada</strong>
                    ) : (
                      <>
                        Faltan{" "}
                        <strong className="text-[#1d1d1f] dark:text-[#e5e5ea] tabular-nums">
                          {isPrivate ? "$••••••" : formatCurrency(remaining)}
                        </strong>
                      </>
                    )}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeposit(goal)}
                    className="text-xs h-7 px-3 rounded-full border-[#e8e8ed] dark:border-white/10"
                  >
                    <ArrowUpRight className="h-3 w-3 mr-1 text-[#0071e3] dark:text-[#2997ff]" /> Aportar
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Deposit Modal */}
      <Modal
        isOpen={isDepositModalOpen && !!activeGoal}
        onClose={() => setIsDepositModalOpen(false)}
        title="Aportar a Meta"
        description={
          activeGoal ? (
            <>
              Destina fondos para <strong className="text-[#1d1d1f] dark:text-white">{activeGoal.name}</strong>.
            </>
          ) : undefined
        }
        maxWidth="sm"
      >
        {activeGoal && (
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">Monto del Aporte (USD $)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="ej. 50.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 tabular-nums"
              />
            </div>

            {/* Quick suggestions */}
            <div className="flex gap-2">
              {[25, 50, 100, 250].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setDepositAmount(quick.toString())}
                  className="flex-1 py-1.5 text-[11px] rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#1d1d1f] dark:text-white font-semibold transition-colors"
                >
                  +${quick}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">Cuenta de Origen (Opcional)</label>
              <CustomSelect
                value={sourceAccountId}
                onChange={(val) => setSourceAccountId(val)}
                modalTitle="Cuenta de Origen"
                aria-label="Cuenta de Origen"
                options={[
                  { value: "", label: "Aporte externo (sin descontar cuenta)" },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${formatCurrency(acc.balance)})`,
                    badge: formatCurrency(acc.balance),
                  })),
                ]}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDepositModalOpen(false)}
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
                Confirmar Aporte
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* New Goal Modal */}
      <Modal
        isOpen={isNewGoalModalOpen}
        onClose={() => setIsNewGoalModalOpen(false)}
        title="Nueva Meta de Ahorro"
        description="Establece un propósito financiero con monto y plazo estimado."
        maxWidth="md"
      >
        <form onSubmit={handleNewGoalSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">Nombre del Objetivo</label>
            <input
              type="text"
              required
              placeholder="ej. Fondo de Viaje, MacBook Pro M4..."
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">Monto Objetivo (USD $)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="ej. 2500.00"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">Fecha Límite</label>
              <input
                type="text"
                placeholder="ej. Diciembre 2027"
                value={newGoalDate}
                onChange={(e) => setNewGoalDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#a1a1a6]">Color de Distintivo</label>
            <div className="flex items-center gap-2 pt-1">
              {["#0071e3", "#30D158", "#BF5AF2", "#FF9F0A", "#FF453A", "#5E5CE6"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewGoalColor(color)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    newGoalColor === color ? "scale-110 border-[#1d1d1f] dark:border-white ring-2 ring-[#0071e3]" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewGoalModalOpen(false)}
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
              Crear Meta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
