"use client";

import * as React from "react";
import { Plus, Download, Search, RotateCcw, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { formatCurrency, parseLocalDate } from "@/lib/utils";
import { toCents, fromCents } from "@/lib/finance/calculator";

export default function TransactionsPage() {
  const { transactions, accounts, deleteTransaction, openTransactionModal } = useFinancialStore();
  const { isPrivate } = usePrivacy();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<"all" | "expense" | "income" | "transfer">("all");
  const [selectedAccount, setSelectedAccount] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  // Unique categories for filter dropdown
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.category) set.add(tx.category);
    }
    return Array.from(set).sort();
  }, [transactions]);

  // Dynamic Filtering & Deterministic Sorting Logic
  const filteredTransactions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = transactions.filter((tx) => {
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      if (selectedAccount !== "all" && tx.accountId !== selectedAccount && tx.toAccountId !== selectedAccount) {
        return false;
      }
      if (selectedCategory !== "all" && tx.category !== selectedCategory) return false;

      if (q) {
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesCat = tx.category.toLowerCase().includes(q);
        const matchesAcc = tx.accountName.toLowerCase().includes(q);
        const matchesAmount = tx.amount.toString().includes(q);
        return matchesDesc || matchesCat || matchesAcc || matchesAmount;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "amount-desc") return toCents(b.amount) - toCents(a.amount);
      if (sortBy === "amount-asc") return toCents(a.amount) - toCents(b.amount);
      const timeA = parseLocalDate(a.date).getTime();
      const timeB = parseLocalDate(b.date).getTime();
      return sortBy === "date-asc" ? timeA - timeB : timeB - timeA;
    });
  }, [transactions, selectedType, selectedAccount, selectedCategory, searchQuery, sortBy]);

  // Decimal-safe totals for filtered view
  const filteredSummary = React.useMemo(() => {
    let incCents = 0;
    let expCents = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === "income") incCents += toCents(tx.amount);
      else if (tx.type === "expense") expCents += toCents(tx.amount);
    }
    return {
      income: Number(fromCents(incCents)),
      expenses: Number(fromCents(expCents)),
    };
  }, [filteredTransactions]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedAccount("all");
    setSelectedCategory("all");
    setSortBy("date-desc");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedType !== "all" ||
    selectedAccount !== "all" ||
    selectedCategory !== "all" ||
    sortBy !== "date-desc";

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Transacciones
          </h2>
          <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b]">
            Historial detallado de ingresos, gastos y transferencias registradas en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/export/csv?type=transactions" download>
            <Button variant="outline" size="sm" className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
            </Button>
          </a>
          <Button
            variant="primary"
            size="sm"
            className="text-xs bg-[#0071e3] hover:bg-[#0066cc] text-white"
            onClick={() => openTransactionModal("expense")}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Nueva Transacción
          </Button>
        </div>
      </div>

      {/* Filter and search bar */}
      <Card className="p-4 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6e6e73] dark:text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar comercio, categoría, monto..."
              aria-label="Buscar transacciones"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white placeholder:text-[#6e6e73] dark:placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            {/* Type selector */}
            <CustomSelect
              size="sm"
              value={selectedType}
              onChange={(val) => setSelectedType(val as any)}
              modalTitle="Filtrar por Tipo"
              aria-label="Filtrar por tipo"
              options={[
                { value: "all", label: "Todos los tipos" },
                { value: "expense", label: "Solo Gastos" },
                { value: "income", label: "Solo Ingresos" },
                { value: "transfer", label: "Transferencias" },
              ]}
            />

            {/* Category selector */}
            <CustomSelect
              size="sm"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              modalTitle="Filtrar por Categoría"
              aria-label="Filtrar por categoría"
              options={[
                { value: "all", label: "Todas las categorías" },
                ...availableCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />

            {/* Account selector */}
            <CustomSelect
              size="sm"
              value={selectedAccount}
              onChange={(val) => setSelectedAccount(val)}
              modalTitle="Filtrar por Cuenta"
              aria-label="Filtrar por cuenta"
              options={[
                { value: "all", label: "Todas las cuentas" },
                ...accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.name.split("—")[0].trim(),
                })),
              ]}
            />

            {/* Sort selector */}
            <CustomSelect
              size="sm"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              modalTitle="Ordenar Movimientos"
              aria-label="Ordenar transacciones"
              options={[
                { value: "date-desc", label: "Más recientes" },
                { value: "date-asc", label: "Más antiguos" },
                { value: "amount-desc", label: "Mayor importe" },
                { value: "amount-asc", label: "Menor importe" },
              ]}
            />

            {/* Reset Filters button if active */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 px-2.5 text-[#6e6e73] dark:text-[#86868b]"
                title="Limpiar filtros"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Filter Summary Counter & Totals */}
        <div className="mt-3 pt-2.5 border-t border-[#e8e8ed] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6e6e73] dark:text-[#86868b]">
          <span>
            Mostrando <strong className="text-[#1d1d1f] dark:text-white">{filteredTransactions.length}</strong> de{" "}
            {transactions.length} movimientos
          </span>
          <div className="flex items-center gap-3 tabular-nums">
            <span>
              Ingresos vista:{" "}
              <strong className="text-[#1D8348] dark:text-[#30D158]">
                {isPrivate ? "$••••••" : formatCurrency(filteredSummary.income)}
              </strong>
            </span>
            <span>•</span>
            <span>
              Gastos vista:{" "}
              <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">
                {isPrivate ? "$••••••" : formatCurrency(filteredSummary.expenses)}
              </strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Transactions list */}
      {filteredTransactions.length > 0 ? (
        <RecentTransactions
          transactions={filteredTransactions}
          onDelete={deleteTransaction}
          showHeaderLink={false}
        />
      ) : (
        <Card className="p-12 text-center bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl">
          <div className="max-w-xs mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mx-auto text-[#6e6e73] dark:text-[#86868b]">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
              No se encontraron movimientos
            </h3>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b]">
              No hay transacciones que coincidan con los filtros aplicados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs mt-2"
            >
              Restablecer filtros
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
