"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Camera,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DEMO_DATA, type Transaction, type Account } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

interface NewTransactionModalProps {
  isOpen: boolean;
  defaultType?: "expense" | "income" | "transfer";
  accounts?: Account[];
  onClose: () => void;
  onAddTransaction: (tx: Transaction) => void;
}

const EXPENSE_CATEGORIES = [
  "Alimentación y Super",
  "Transporte y Auto",
  "Suscripciones y Software",
  "Vivienda y Servicios",
  "Entretenimiento y Ocio",
  "Salud y Bienestar",
  "Otros",
];

const INCOME_CATEGORIES = [
  "Ingresos Profesionales",
  "Honorarios y Consultoría",
  "Rendimientos e Inversiones",
  "Reembolsos",
  "Otros Ingresos",
];

function getTodayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function NewTransactionModal({
  isOpen,
  defaultType = "expense",
  accounts = DEMO_DATA.accounts,
  onClose,
  onAddTransaction,
}: NewTransactionModalProps) {
  useBodyScrollLock(isOpen);

  const [type, setType] = React.useState<"expense" | "income" | "transfer">(defaultType);
  const [amount, setAmount] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [category, setCategory] = React.useState<string>("Alimentación y Super");
  const [accountId, setAccountId] = React.useState<string>(accounts[0]?.id || "acc-1");
  const [toAccountId, setToAccountId] = React.useState<string>(accounts[1]?.id || "acc-2");
  const [date, setDate] = React.useState<string>(getTodayLocalIso);
  const [error, setError] = React.useState<string | null>(null);

  // Receipt OCR states
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanBadge, setScanBadge] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync defaultType and default categories when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setCategory(defaultType === "income" ? "Ingresos Profesionales" : "Alimentación y Super");
      setDate(getTodayLocalIso());
      setError(null);
      setScanBadge(null);
    }
  }, [isOpen, defaultType]);

  const handleTypeChange = (nextType: "expense" | "income" | "transfer") => {
    setType(nextType);
    setError(null);
    if (nextType === "income" && !INCOME_CATEGORIES.includes(category)) {
      setCategory("Ingresos Profesionales");
    } else if (nextType === "expense" && !EXPENSE_CATEGORIES.includes(category)) {
      setCategory("Alimentación y Super");
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);
    setScanBadge(null);

    try {
      const base64DataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/finance/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64DataUri }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "No se pudo escanear la factura");
      }

      const { data } = await res.json();
      if (data) {
        if (
          (typeof data.confidence === "number" && data.confidence < 0.25 && !data.amount) ||
          /no legible/i.test(data.merchant || "")
        ) {
          setError("La imagen no parece una factura legible. Intenta con una foto más clara.");
          return;
        }
        setType("expense");
        setAmount(data.amount ? data.amount.toFixed(2) : "");
        setDescription(data.merchant ? `${data.merchant} — ${data.description}` : data.description);
        if (data.category && EXPENSE_CATEGORIES.includes(data.category)) {
          setCategory(data.category);
        }
        if (data.date) {
          setDate(data.date);
        }

        // Match account if payment method detected
        if (data.paymentMethod) {
          const lowerMethod = data.paymentMethod.toLowerCase();
          const matchedAcc = accounts.find((a) => a.name.toLowerCase().includes(lowerMethod));
          if (matchedAcc) {
            setAccountId(matchedAcc.id);
          }
        }

        setScanBadge(`Detectado: ${data.merchant || "Factura"} ($${Number(data.amount || 0).toFixed(2)})`);
      }
    } catch (err: any) {
      setError(`Error al leer factura: ${err.message || "Archivo no legible"}`);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Close on Esc
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const activeCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/,/g, "."));
    if (isNaN(num) || num <= 0) {
      setError("Introduce un importe válido mayor a $0.00");
      return;
    }
    if (!description.trim()) {
      setError("Introduce una descripción o comercio");
      return;
    }
    if (type === "transfer" && accountId === toAccountId) {
      setError("La cuenta de destino debe ser distinta a la cuenta de origen");
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === accountId);
    const destAccount = type === "transfer" ? accounts.find((a) => a.id === toAccountId) : undefined;

    const newTx: Transaction = {
      id: `tx-user-${Date.now()}`,
      description: description.trim(),
      amount: Math.round(num * 100) / 100,
      type: type,
      category: type === "transfer" ? "Transferencia Interna" : category,
      date: date || getTodayLocalIso(),
      accountId: accountId,
      accountName: selectedAccount ? selectedAccount.name.split("—")[0].trim() : "Cuenta Personal",
      toAccountId: type === "transfer" ? toAccountId : undefined,
      toAccountName: destAccount ? destAccount.name.split("—")[0].trim() : undefined,
      source: "web",
      status: "completed",
    };

    onAddTransaction(newTx);
    // Reset and close
    setAmount("");
    setDescription("");
    setError(null);
    setScanBadge(null);
    onClose();
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain p-3.5 sm:p-6 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-tx-title"
        style={{ maxHeight: "calc(100dvh - 2rem)" }}
        className="relative w-full max-w-lg my-auto flex flex-col bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.1] rounded-[24px] shadow-2xl overflow-hidden text-[#1d1d1f] dark:text-[#f5f5f7] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 p-5 sm:p-6 pb-3 sm:pb-3.5 border-b border-[#e8e8ed] dark:border-white/[0.08] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h2 id="modal-tx-title" className="text-lg font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              Nuevo Movimiento
            </h2>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5 truncate">
              Manual o mediante escaneo de factura fotográfica con IA
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Camera OCR button */}
            <label
              className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isScanning
                  ? "bg-[#0071E3]/15 text-[#0071E3] border-[#0071E3]/30 animate-pulse pointer-events-none"
                  : "bg-[#0071E3]/10 hover:bg-[#0071E3]/18 text-[#0071E3] dark:text-[#2997ff] border-[#0071E3]/25 active:scale-95"
              }`}
              title="Tomar o subir foto de factura para rellenar con IA"
            >
              {isScanning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              <span>{isScanning ? "Escaneando..." : "Foto Factura"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScanReceipt}
                className="hidden"
                disabled={isScanning}
              />
            </label>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="h-8 w-8 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
            {/* Scan success badge if any */}
            {scanBadge && (
              <div className="p-2.5 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#1D8348] dark:text-[#30D158] flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#28CD41] dark:text-[#30D158]" />
                  <span>{scanBadge}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScanBadge(null)}
                  className="p-1 text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          {/* Type Selector (3 Apple-style Pills) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#f5f5f7] dark:bg-[#1f1f21] border border-[#e8e8ed] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                type === "expense"
                  ? "bg-white dark:bg-[#2a2a2c] text-[#D70015] dark:text-[#FF453A] shadow-xs"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Gasto</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                type === "income"
                  ? "bg-white dark:bg-[#2a2a2c] text-[#1D8348] dark:text-[#30D158] shadow-xs"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Ingreso</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("transfer")}
              className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                type === "transfer"
                  ? "bg-white dark:bg-[#2a2a2c] text-[#0071e3] dark:text-[#2997ff] shadow-xs"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Transferencia</span>
            </button>
          </div>

          {/* Amount and Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-[#424245] dark:text-[#a1a1a6]">
                Importe (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-[#6e6e73] dark:text-[#86868b]">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 text-lg font-bold rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white placeholder:text-[#86868b]/50 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] tabular-nums"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#424245] dark:text-[#a1a1a6] flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] tabular-nums"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#424245] dark:text-[#a1a1a6]">
              Descripción / Concepto
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder="ej. Panadería La Espiga, Gasolina Terpel..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white placeholder:text-[#86868b]/60 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3]"
            />
          </div>

          {/* Category & Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== "transfer" ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#424245] dark:text-[#a1a1a6]">
                  Categoría
                </label>
                <CustomSelect
                  value={category}
                  onChange={(val) => setCategory(val)}
                  modalTitle="Seleccionar Categoría"
                  aria-label="Categoría"
                  options={activeCategories.map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                />
              </div>
            ) : null}

            {/* Source Account (Cuenta / Billetera de Origen) */}
            <div className={`space-y-1 ${type === "transfer" ? "sm:col-span-1" : ""}`}>
              <label className="text-xs font-medium text-[#424245] dark:text-[#a1a1a6]">
                {type === "transfer" ? "Cuenta Origen" : type === "income" ? "Cuenta Destino" : "Billetera / Cuenta"}
              </label>
              <CustomSelect
                value={accountId}
                onChange={(val) => {
                  setAccountId(val);
                  setError(null);
                }}
                modalTitle={type === "transfer" ? "Cuenta Origen" : type === "income" ? "Cuenta Destino" : "Billetera / Cuenta"}
                aria-label="Billetera o Cuenta"
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name.split("—")[0].trim()} (${formatCurrency(acc.balance)})`,
                  badge: formatCurrency(acc.balance),
                }))}
              />
            </div>

            {/* Destination Account for Transfers */}
            {type === "transfer" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#424245] dark:text-[#a1a1a6]">
                  Cuenta Destino
                </label>
                <CustomSelect
                  value={toAccountId}
                  onChange={(val) => {
                    setToAccountId(val);
                    setError(null);
                  }}
                  modalTitle="Cuenta Destino"
                  aria-label="Cuenta Destino"
                  options={accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name.split("—")[0].trim()} (${formatCurrency(acc.balance)})`,
                    badge: formatCurrency(acc.balance),
                  }))}
                />
              </div>
            )}
          </div>

          {/* Error notice if any */}
          {error && (
            <div className="p-2.5 rounded-xl bg-[#FF453A]/12 border border-[#FF453A]/25 text-[#D70015] dark:text-[#FF453A] text-xs font-medium">
              {error}
            </div>
          )}

          </div>

          {/* Form Actions */}
          <div className="shrink-0 flex items-center justify-end gap-2 p-4 sm:px-6 border-t border-[#e8e8ed] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-xl px-5 bg-[#0071e3] hover:bg-[#0066cc] text-white"
            >
              <Check className="h-4 w-4 mr-1.5" />
              <span>Guardar Movimiento</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
