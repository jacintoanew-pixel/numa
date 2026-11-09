"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Landmark,
  PiggyBank,
  Banknote,
  AlertCircle,
  Building2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { formatCurrency } from "@/lib/utils";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BankEntity {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  color: string;
  isBank: boolean;
  category: "bank" | "wallet" | "cash";
}

export const BANK_CATALOG: BankEntity[] = [
  {
    id: "banco_general",
    name: "Banco General",
    shortName: "Banco General",
    logo: "/banks/banco-general.jpg",
    color: "#004F9F",
    isBank: true,
    category: "bank",
  },
  {
    id: "bac",
    name: "BAC Credomatic",
    shortName: "BAC",
    logo: "/banks/bac-credomatic.png",
    color: "#E31B23",
    isBank: true,
    category: "bank",
  },
  {
    id: "banco_nacional",
    name: "Banco Nacional de Panamá",
    shortName: "Banco Nacional",
    logo: "/banks/banco-nacional.png",
    color: "#002D62",
    isBank: true,
    category: "bank",
  },
  {
    id: "banistmo",
    name: "Banistmo",
    shortName: "Banistmo",
    logo: "/banks/banistmo.png",
    color: "#FDDA24",
    isBank: true,
    category: "bank",
  },
  {
    id: "caja_ahorros",
    name: "Caja de Ahorros",
    shortName: "Caja de Ahorros",
    logo: "/banks/caja-de-ahorros.webp",
    color: "#0055A5",
    isBank: true,
    category: "bank",
  },
  {
    id: "global_bank",
    name: "Global Bank",
    shortName: "Global Bank",
    logo: "/banks/global-bank.webp",
    color: "#00965E",
    isBank: true,
    category: "bank",
  },
  {
    id: "banisi",
    name: "Banisi",
    shortName: "Banisi",
    logo: "/banks/banisi.png",
    color: "#0072CE",
    isBank: true,
    category: "bank",
  },
  {
    id: "yappy",
    name: "Yappy",
    shortName: "Yappy",
    logo: "/banks/yappy.png",
    color: "#0071E3",
    isBank: false,
    category: "wallet",
  },
  {
    id: "punto_pago",
    name: "Punto Pago",
    shortName: "Punto Pago",
    logo: "/banks/punto-pago.jpg",
    color: "#1E40AF",
    isBank: false,
    category: "wallet",
  },
  {
    id: "paypal",
    name: "PayPal",
    shortName: "PayPal",
    logo: "/banks/paypal.png",
    color: "#003087",
    isBank: false,
    category: "wallet",
  },
  {
    id: "cash",
    name: "Dinero en Efectivo",
    shortName: "Efectivo",
    color: "#10B981",
    isBank: false,
    category: "cash",
  },
  {
    id: "other",
    name: "Otro Banco",
    shortName: "Otro Banco",
    color: "#64748B",
    isBank: true,
    category: "bank",
  },
];

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  useBodyScrollLock(isOpen);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { accounts, addAccount, deleteAccount } = useFinancialStore();

  const [activeTab, setActiveTab] = React.useState<"add" | "list">("add");
  const [selectedBankId, setSelectedBankId] = React.useState("banco_general");
  const [accountTypeSub, setAccountTypeSub] = React.useState<"savings" | "checking">("savings");
  const [customName, setCustomName] = React.useState("");
  const [lastDigits, setLastDigits] = React.useState("");
  const [balance, setBalance] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [error, setError] = React.useState<string | null>(null);

  // Custom confirmation dialog state for account deletion
  const [accountToDelete, setAccountToDelete] = React.useState<{ id: string; name: string } | null>(null);

  // Close on Escape key (cancels deletion first if open)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (accountToDelete) {
          setAccountToDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, accountToDelete]);

  const selectedBank = React.useMemo(() => {
    return BANK_CATALOG.find((b) => b.id === selectedBankId) || BANK_CATALOG[0];
  }, [selectedBankId]);

  // Compute suggested name whenever bank or subtype changes
  React.useEffect(() => {
    if (selectedBank.isBank) {
      const typeLabel = accountTypeSub === "savings" ? "Ahorro" : "Corriente";
      setCustomName(`${selectedBank.shortName} — ${typeLabel}`);
    } else {
      setCustomName(selectedBank.name);
    }
  }, [selectedBank, accountTypeSub]);

  // Reset inputs when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedBankId("banco_general");
      setAccountTypeSub("savings");
      setBalance("");
      setLastDigits("");
      setCurrency("USD");
      setError(null);
      setAccountToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = customName.trim();
    if (!trimmed) {
      setError("Introduce el nombre identificador de la cuenta.");
      return;
    }

    const numBalance = parseFloat(balance.replace(/[^0-9.-]/g, "")) || 0;

    let finalType: string = "bank";
    // ONLY set masked digits if the user actually typed them. Never invent fake digits.
    let masked: string | undefined = undefined;
    const cleanDigits = lastDigits.replace(/\D/g, "").trim();
    if (cleanDigits.length > 0) {
      masked = `•••• ${cleanDigits}`;
    }

    if (selectedBank.isBank) {
      finalType = accountTypeSub === "savings" ? "savings" : "checking";
    } else if (selectedBank.id === "cash") {
      finalType = "cash";
    } else if (selectedBank.id === "yappy") {
      finalType = "yappy";
    } else if (selectedBank.id === "punto_pago") {
      finalType = "card";
    } else if (selectedBank.id === "paypal") {
      finalType = "paypal";
    }

    addAccount({
      name: trimmed,
      type: finalType,
      balance: numBalance,
      currency,
      accountNumberMasked: masked || "",
      color: selectedBank.color,
      logo: selectedBank.logo,
    });

    onClose();
  };

  const handleDeleteClick = (id: string, accName: string) => {
    if (accounts.length <= 1) {
      setError("Debes conservar al menos una cuenta en tu patrimonio.");
      return;
    }
    setError(null);
    setAccountToDelete({ id, name: accName });
  };

  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    deleteAccount(accountToDelete.id);
    setAccountToDelete(null);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain p-3 sm:p-4 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (accountToDelete) {
          setAccountToDelete(null);
        } else {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-account-title"
        style={{ maxHeight: "calc(100dvh - 2rem)" }}
        className="relative w-full max-w-lg my-auto flex flex-col bg-white dark:bg-[#1c1c1e] border border-[#e8e8ed] dark:border-white/[0.1] rounded-[24px] shadow-2xl overflow-hidden text-[#1d1d1f] dark:text-[#f5f5f7] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom Confirmation Dialog for Account Deletion (Numa Identity) */}
        {accountToDelete && (
          <div
            className="absolute inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setAccountToDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#252528] border border-[#e8e8ed] dark:border-white/[0.12] p-5 sm:p-6 shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-[#ff453a] flex items-center justify-center shadow-xs">
                <Trash2 className="h-6 w-6 text-[#ff453a]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                  ¿Eliminar cuenta?
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-[#86868b] leading-relaxed">
                  ¿Estás seguro de que deseas eliminar <strong className="text-[#1d1d1f] dark:text-white">&ldquo;{accountToDelete.name}&rdquo;</strong>? Esta acción removerá la cuenta y sus fondos de tu patrimonio.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAccountToDelete(null)}
                  className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer border-[#e8e8ed] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmDelete}
                  className="w-full h-10 rounded-xl text-xs font-semibold bg-[#ff453a] hover:bg-[#d70015] text-white shadow-xs cursor-pointer border-0"
                >
                  Eliminar Cuenta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-[#e8e8ed] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#1c1c1e]">
          <div className="min-w-0 pr-2">
            <h2 id="modal-account-title" className="text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Gestión de Cuentas
            </h2>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5 truncate">
              Agrega tus bancos o medios de pago y elige tu tipo de cuenta
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#6e6e73] dark:text-[#86868b] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fixed Tab Switcher */}
        <div className="shrink-0 p-1.5 mx-4 sm:mx-6 my-2.5 bg-[#f5f5f7] dark:bg-white/[0.05] rounded-2xl gap-1 flex">
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "add"
                ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-xs"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Cuenta</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "list"
                ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-xs"
                : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Mis Cuentas ({accounts.length})</span>
          </button>
        </div>

        {error && (
          <div className="shrink-0 mx-4 sm:mx-6 my-1 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Formulario Nueva Cuenta */}
        {activeTab === "add" && (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 touch-pan-y">
              {/* Step 1: Select Financial Entity */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] block">
                  1. Selecciona la Entidad Financiera o Método
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {BANK_CATALOG.map((bank) => {
                    const isSelected = selectedBankId === bank.id;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer relative group ${
                          isSelected
                            ? "bg-[#0071E3]/5 dark:bg-[#0071E3]/15 border-[#0071E3] ring-2 ring-[#0071E3]/30 shadow-xs"
                            : "border-[#e8e8ed] dark:border-white/[0.08] bg-white dark:bg-[#252528] hover:border-[#0071E3]/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                        <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/[0.08] border border-[#e8e8ed] dark:border-white/10 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {bank.logo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={bank.logo}
                              alt={bank.name}
                              className="h-full w-full object-contain"
                            />
                          ) : bank.id === "cash" ? (
                            <Banknote className="h-5 w-5 text-[#10B981]" />
                          ) : (
                            <Landmark className="h-5 w-5 text-[#64748B]" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#1d1d1f] dark:text-white leading-tight line-clamp-1">
                          {bank.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Obligatory Question for Banks: Ahorro o Corriente? */}
              {selectedBank.isBank && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-[#0071E3]/5 dark:bg-[#0071E3]/10 border border-[#0071E3]/25 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-[#0071E3] dark:text-[#2997ff]" />
                    <label className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                      2. ¿Qué tipo de cuenta deseas agregar en {selectedBank.shortName}?
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAccountTypeSub("savings")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                        accountTypeSub === "savings"
                          ? "bg-white dark:bg-[#2c2c2e] border-[#0071E3] ring-2 ring-[#0071E3]/40 shadow-sm"
                          : "border-[#e8e8ed] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-[#30D158]/15 text-[#1D8348] dark:text-[#30D158] flex items-center justify-center">
                        <PiggyBank className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                        Cuenta de Ahorro
                      </span>
                      <span className="text-[10px] text-[#6e6e73] dark:text-[#86868b] leading-tight">
                        Ahorros e intereses
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountTypeSub("checking")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                        accountTypeSub === "checking"
                          ? "bg-white dark:bg-[#2c2c2e] border-[#0071E3] ring-2 ring-[#0071E3]/40 shadow-sm"
                          : "border-[#e8e8ed] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-[#0071E3]/15 text-[#0071E3] dark:text-[#2997ff] flex items-center justify-center">
                        <Landmark className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                        Cuenta Corriente
                      </span>
                      <span className="text-[10px] text-[#6e6e73] dark:text-[#86868b] leading-tight">
                        Cheques y diario
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Account Name (Customizable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Nombre en la Aplicación
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Ej. Banco General — Ahorro"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                />
              </div>

              {/* Step 4: Balance & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Saldo Inicial Disponible ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Últimos 4 Dígitos (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Ej. 4821"
                    value={lastDigits}
                    onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-10 px-3.5 rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 p-3.5 sm:p-4 bg-white dark:bg-[#1c1c1e] border-t border-[#e8e8ed] dark:border-white/[0.06] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-4 text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="h-9 px-5 text-xs font-semibold rounded-xl bg-[#0071e3] hover:bg-[#0066cc] text-white shadow-xs cursor-pointer"
              >
                Guardar Cuenta
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Lista y Eliminación de Cuentas */}
        {activeTab === "list" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-2.5 touch-pan-y">
            {accounts.map((acc) => {
              const isSavings = acc.type === "savings" || acc.name.toLowerCase().includes("ahorro");
              const isChecking = acc.type === "checking" || acc.type === "bank" || acc.name.toLowerCase().includes("corriente");

              return (
                <div
                  key={acc.id}
                  className="p-3 rounded-2xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-[#e8e8ed] dark:border-white/[0.06] flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-white/10 border border-[#e8e8ed] dark:border-white/10 flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      {acc.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={acc.logo}
                          alt={acc.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Landmark className="h-4 w-4 text-[#0071e3]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">
                        {acc.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#6e6e73] dark:text-[#86868b]">
                        <span className="font-medium text-[#0071E3] dark:text-[#2997ff]">
                          {isSavings ? "Cuenta de Ahorro" : isChecking ? "Cuenta Corriente" : acc.type}
                        </span>
                        {acc.accountNumberMasked && acc.accountNumberMasked.trim() && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{acc.accountNumberMasked}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {formatCurrency(acc.balance, acc.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(acc.id, acc.name)}
                      className="p-2 rounded-lg text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors cursor-pointer"
                      title={`Eliminar cuenta ${acc.name}`}
                      aria-label={`Eliminar cuenta ${acc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
