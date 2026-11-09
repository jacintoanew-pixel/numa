"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  CalendarSync,
  PieChart,
  Target,
  FileBarChart,
  Bot,
  Settings,
  Eye,
  EyeOff,
  Download,
  CreditCard,
  X,
  Command,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { formatCurrency } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  balance?: string;
  category: "Navegación" | "Acciones" | "Cuentas";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  useBodyScrollLock(open);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const { accounts, openTransactionModal } = useFinancialStore();

  const commands: CommandItem[] = React.useMemo(
    () => [
      {
        id: "act-new-exp",
        title: "Registrar Nuevo Gasto",
        category: "Acciones",
        icon: ArrowDownLeft,
        shortcut: "N",
        action: () => openTransactionModal("expense"),
      },
      {
        id: "act-new-inc",
        title: "Registrar Nuevo Ingreso",
        category: "Acciones",
        icon: ArrowUpRight,
        action: () => openTransactionModal("income"),
      },
      {
        id: "act-new-trf",
        title: "Realizar Transferencia entre Cuentas",
        category: "Acciones",
        icon: ArrowLeftRight,
        action: () => openTransactionModal("transfer"),
      },
      {
        id: "nav-dash",
        title: "Ir a Dashboard",
        category: "Navegación",
        icon: LayoutDashboard,
        action: () => router.push("/dashboard"),
      },
      {
        id: "nav-tx",
        title: "Ver Transacciones",
        category: "Navegación",
        icon: ArrowLeftRight,
        action: () => router.push("/transactions"),
      },
      {
        id: "nav-sub",
        title: "Gestionar Suscripciones",
        category: "Navegación",
        icon: CalendarSync,
        action: () => router.push("/subscriptions"),
      },
      {
        id: "nav-bud",
        title: "Revisar Presupuestos",
        category: "Navegación",
        icon: PieChart,
        action: () => router.push("/budgets"),
      },
      {
        id: "nav-goals",
        title: "Metas de Ahorro",
        category: "Navegación",
        icon: Target,
        action: () => router.push("/goals"),
      },
      {
        id: "nav-rep",
        title: "Reportes Consolidados",
        category: "Navegación",
        icon: FileBarChart,
        action: () => router.push("/reports"),
      },
      {
        id: "nav-ai",
        title: "Asistente Financiero",
        category: "Navegación",
        icon: Bot,
        action: () => router.push("/assistant"),
      },
      {
        id: "nav-set",
        title: "Configuración del Sistema",
        category: "Navegación",
        icon: Settings,
        action: () => router.push("/settings"),
      },
      {
        id: "act-priv",
        title: isPrivate ? "Desactivar Modo Privacidad" : "Activar Modo Privacidad (Ocultar Saldos)",
        category: "Acciones",
        icon: isPrivate ? Eye : EyeOff,
        shortcut: "P",
        action: () => togglePrivacy(),
      },
      {
        id: "act-csv",
        title: "Descargar Transacciones en CSV",
        category: "Acciones",
        icon: Download,
        action: () => {
          window.location.href = "/api/export/csv?type=transactions";
        },
      },
      ...accounts.map((acc) => {
        const cleanName = acc.name.split("—")[0].trim();
        const typeLabel =
          cleanName.toLowerCase().includes("caja de ahorro")
            ? "Cuenta de Ahorro"
            : cleanName.toLowerCase().includes("banistmo")
            ? "Cuenta de Ahorro"
            : cleanName.toLowerCase().includes("yappy")
            ? "Caja de Ahorros"
            : cleanName.toLowerCase().includes("punto pago")
            ? "Débito"
            : cleanName.toLowerCase().includes("paypal")
            ? "Saldo Digital"
            : cleanName.toLowerCase().includes("efectivo")
            ? "Dinero Físico"
            : "Cuenta Conectada";
        const balanceFormatted = isPrivate ? "$••••••" : formatCurrency(acc.balance, acc.currency);
        return {
          id: `acc-${acc.id}`,
          title: cleanName,
          subtitle: typeLabel,
          balance: balanceFormatted,
          category: "Cuentas" as const,
          icon: CreditCard,
          action: () => {
            router.push("/dashboard#cuentas");
            if (typeof window !== "undefined") {
              setTimeout(() => {
                const el =
                  document.getElementById(`cuenta-${acc.id}`) ||
                  document.getElementById("cuentas");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 120);
            }
          },
        };
      }),
    ],
    [router, isPrivate, togglePrivacy, openTransactionModal, accounts]
  );

  const filtered = React.useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q))
    );
  }, [commands, query]);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setOpen(false);
      setQuery("");
    }
  };

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain flex items-start justify-center pt-6 sm:pt-20 px-3 sm:px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#272729] rounded-2xl border border-[#e8e8ed] dark:border-white/[0.12] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 sm:px-4 border-b border-[#e8e8ed] dark:border-white/[0.08] gap-2">
          <Search className="h-4 w-4 text-[#6e6e73] dark:text-[#86868b] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar sección, acción, cuenta... (ej. presupuestos, yappy)"
            className="w-full py-3.5 text-xs sm:text-sm bg-transparent text-[#1d1d1f] dark:text-white placeholder:text-[#6e6e73] dark:placeholder:text-[#86868b] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="sm:hidden p-1.5 rounded-lg text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            aria-label="Cerrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-[#6e6e73] dark:text-[#86868b] bg-black/[0.04] dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/10 px-1.5 py-0.5 rounded shrink-0">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto overscroll-contain p-2 divide-y divide-transparent">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setOpen(false);
                    setQuery("");
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-3 sm:py-2.5 rounded-xl text-left text-xs transition-colors active:scale-[0.99] ${
                    isSelected
                      ? "bg-[#0071e3] text-white font-medium"
                      : "text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-[#0071e3] dark:text-[#2997ff]"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.title}</div>
                      {item.subtitle && (
                        <div className={`text-[11px] truncate ${isSelected ? "text-white/80" : "text-[#6e6e73] dark:text-[#86868b]"}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.balance ? (
                      <span className={`font-mono font-bold text-xs tabular-nums px-2 py-0.5 rounded-md ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-black/[0.04] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-white"
                      }`}>
                        {item.balance}
                      </span>
                    ) : (
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${isSelected ? "text-white/80" : "text-[#6e6e73] dark:text-[#86868b]"}`}>
                        {item.category}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd className={`hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border ${isSelected ? "bg-white/20 border-white/30 text-white" : "bg-black/[0.04] dark:bg-white/[0.06] border-[#e8e8ed] dark:border-white/10 text-[#6e6e73] dark:text-[#86868b]"}`}>
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-[#6e6e73] dark:text-[#86868b]">
              No se encontraron comandos para &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 border-t border-[#e8e8ed] dark:border-white/[0.06] bg-[#f5f5f7] dark:bg-[#262629] flex items-center justify-between text-[11px] text-[#6e6e73] dark:text-[#86868b]">
          <span className="hidden sm:inline">Usa las flechas ↑ ↓ para navegar y Enter para seleccionar</span>
          <span className="sm:hidden">Toca cualquier opción para seleccionarla</span>
          <span className="font-mono">numa Spotlight</span>
        </div>
      </div>
    </div>
  );
}
