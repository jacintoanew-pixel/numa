"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarSync,
  PieChart,
  Target,
  FileBarChart,
  Bot,
  Settings,
  Plus,
  Bell,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";
import { usePrivacy } from "@/components/theme/privacy-provider";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { useSecurity } from "@/components/providers/security-provider";
import { LogOut, LogIn, ChevronDown, User as UserIcon } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transacciones", href: "/transactions", icon: ArrowLeftRight },
  { label: "Suscripciones", href: "/subscriptions", icon: CalendarSync },
  { label: "Presupuestos", href: "/budgets", icon: PieChart },
  { label: "Metas", href: "/goals", icon: Target },
  { label: "Reportes", href: "/reports", icon: FileBarChart },
  { label: "Asistente", href: "/assistant", icon: Bot, isAi: true },
  { label: "Configuración", href: "/settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const { openTransactionModal } = useFinancialStore();
  const { session, isLoggedIn, openAuthModal, logout } = useSecurity();
  const [avatarBroken, setAvatarBroken] = React.useState(false);

  React.useEffect(() => {
    setAvatarBroken(false);
  }, [session?.avatarUrl]);

  const userInitials = React.useMemo(() => {
    if (!session?.name) return "US";
    const parts = session.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return session.name.slice(0, 2).toUpperCase() || "US";
  }, [session?.name]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut listener ('p' or 'P' to toggle privacy)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }
      if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        togglePrivacy();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePrivacy]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#121214]/85 backdrop-blur-xl text-[#1d1d1f] dark:text-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] border-b border-[#e8e8ed] dark:border-white/[0.08] transition-colors duration-200">
      {/* Top Navbar */}
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-5 xl:px-4 2xl:px-8">
        <div className="flex items-center justify-between h-16 gap-2 xl:gap-2 2xl:gap-4">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 select-none">
              <div className="h-10 w-10 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/numa-icon.png"
                  alt="numa"
                  className="h-9 w-9 object-contain transition-transform group-hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                />
              </div>
              <div className="flex flex-col justify-center shrink-0">
                <span className="font-bold text-base sm:text-lg tracking-tight text-[#1d1d1f] dark:text-white leading-tight whitespace-nowrap">
                  numa
                </span>
                <span className="hidden sm:block xl:hidden 2xl:block text-[10px] sm:text-[11px] font-medium text-[#6e6e73] dark:text-[#86868b] tracking-wide leading-tight whitespace-nowrap">
                  Finanzas Personales
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Active for laptops (xl) and desktops (2xl) */}
          <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 shrink-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-1 2xl:gap-1.5 px-1.5 py-1.5 2xl:px-2.5 rounded-lg text-[11px] 2xl:text-xs font-medium whitespace-nowrap transition-all border active:scale-95 duration-100",
                    isActive
                      ? "bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20 font-semibold shadow-xs dark:bg-white/[0.12] dark:text-white dark:border-white/[0.18] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md"
                      : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] dark:text-[#a1a1a6] dark:hover:text-white dark:hover:bg-white/[0.06] border-transparent",
                    item.isAi && !isActive && "text-[#0071E3] dark:text-[#2997ff]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      item.isAi ? "text-[#0071e3] dark:text-[#2997ff]" : ""
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Spotlight / Command Palette Button - Visible on mobile and desktop */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
              }}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-2 sm:px-2.5 text-xs rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-[#e8e8ed] dark:border-white/[0.1] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-all active:scale-95 shadow-2xs"
              title="Buscar (Atajo: Ctrl + K / Cmd + K)"
              aria-label="Buscar sección, acción o cuenta"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline text-[11px] font-medium">Buscar</span>
              <kbd className="hidden md:inline font-mono text-[10px] px-1 py-0.2 bg-black/[0.04] dark:bg-white/[0.08] rounded border border-black/5 dark:border-white/10">
                ⌘K
              </kbd>
            </button>

            {/* Privacy Mode Toggle (Hide/Show Balances) */}
            <button
              type="button"
              onClick={togglePrivacy}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border transition-all active:scale-95 shadow-2xs",
                isPrivate
                  ? "bg-[#0071E3]/15 text-[#0071E3] dark:text-[#2997ff] border-[#0071E3]/30"
                  : "bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-[#e8e8ed] dark:border-white/[0.1] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              )}
              title={isPrivate ? "Mostrar cifras y saldos (Atajo: P)" : "Ocultar cifras por privacidad (Atajo: P)"}
              aria-label="Modo Privacidad"
            >
              {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {/* Apple Theme Toggle Button (Light/Dark mode) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white transition-all active:scale-95 shadow-2xs"
              title={theme === "dark" ? "Cambiar a modo claro (Apple White Canvas)" : "Cambiar a modo oscuro (Apple Graphite)"}
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-[#FF9F0A]" />
              ) : (
                <Moon className="h-4 w-4 text-[#0071E3]" />
              )}
            </button>

            {/* Quick Action button: Circular Apple '+' with instant modal */}
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => openTransactionModal("expense")}
              className="hidden sm:inline-flex items-center justify-center h-8 w-8 p-0 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-xs transition-transform active:scale-95"
              title="Registrar Nueva Transacción"
              aria-label="Nueva Transacción"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Single Account: Iniciar Sesión / Cerrar Sesión - Visible on tablet/desktop (sm+) */}
            <div className="hidden sm:relative sm:flex items-center pl-1 sm:pl-2 border-l border-[#e8e8ed] dark:border-white/[0.1] shrink-0" ref={dropdownRef}>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#0071E3]/30 transition-all active:scale-95"
                  title={`Cuenta activa: ${session.name}`}
                  aria-label="Menú de Cuenta"
                >
                  {session?.avatarUrl && !avatarBroken ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={session.avatarUrl}
                      alt={session.name || "Usuario"}
                      onError={() => setAvatarBroken(true)}
                      className="h-8 w-8 rounded-full object-cover shadow-xs ring-1 ring-black/10 dark:ring-white/20 shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#0071E3] to-sky-400 flex items-center justify-center text-xs font-bold text-white shadow-xs ring-1 ring-black/10 dark:ring-white/20 shrink-0">
                      {userInitials}
                    </div>
                  )}
                  <ChevronDown className="h-3 w-3 text-[#6e6e73] dark:text-[#86868b]" />
                </button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openAuthModal("login")}
                  className="h-8 rounded-full text-xs font-semibold px-3 text-[#0071E3] dark:text-white border-[#e8e8ed] dark:border-white/[0.1] hover:bg-[#0071E3]/10"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1 text-[#0071E3]" /> Iniciar Sesión
                </Button>
              )}

              {/* Desktop User Menu Dropdown */}
              {userDropdownOpen && isLoggedIn && (
                <div className="absolute right-0 top-11 w-60 rounded-2xl bg-white/95 dark:bg-[#1f1f21]/95 backdrop-blur-2xl border border-[#e8e8ed] dark:border-white/[0.12] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {/* Single Account info */}
                  <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] mb-2 border border-[#e8e8ed] dark:border-white/[0.06] flex items-center gap-2.5">
                    {session?.avatarUrl && !avatarBroken ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={session.avatarUrl}
                        alt={session.name || "Usuario"}
                        onError={() => setAvatarBroken(true)}
                        className="h-9 w-9 rounded-full object-cover shadow-xs ring-1 ring-black/10 dark:ring-white/20 shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#0071E3] to-sky-400 flex items-center justify-center text-xs font-bold text-white shadow-xs ring-1 ring-black/10 dark:ring-white/20 shrink-0">
                        {userInitials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[#1d1d1f] dark:text-white truncate">
                        {session?.name || "Usuario"}
                      </div>
                      {session?.username ? (
                        <div className="text-[11px] font-semibold text-[#0071E3] dark:text-[#2997ff] truncate">
                          @{session.username}
                        </div>
                      ) : null}
                      {session?.email &&
                      !session.email.endsWith("@numa.local") &&
                      !session.email.endsWith("@example.com") ? (
                        <div className="text-[10px] text-[#6e6e73] dark:text-[#86868b] truncate">
                          {session.email}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions list */}
                  <div className="space-y-0.5 text-xs">
                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors text-left"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#2997ff]" />
                      <span>Configuración de Cuenta</span>
                    </Link>

                    <div className="my-1 border-t border-[#e8e8ed] dark:border-white/[0.06]" />

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[#D70015] dark:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors text-left font-medium"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button - Active only below xl (< 1280px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 rounded-lg text-[#6e6e73] dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/10 transition-colors shrink-0"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation - Only below xl (< 1280px) */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#e8e8ed] dark:border-white/[0.08] bg-white/95 dark:bg-[#121214]/95 backdrop-blur-2xl p-4 space-y-3 animate-in slide-in-from-top duration-200">
          {/* User profile row inside drawer */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e8e8ed] dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              {session?.avatarUrl && !avatarBroken ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={session.avatarUrl}
                  alt={session.name || "Usuario"}
                  onError={() => setAvatarBroken(true)}
                  className="h-9 w-9 rounded-full object-cover shadow-xs ring-1 ring-black/10 dark:ring-white/20 shrink-0"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#0071E3] to-sky-400 flex items-center justify-center text-xs font-bold text-white shadow-xs ring-1 ring-black/10 dark:ring-white/20">
                  {userInitials}
                </div>
              )}
              <div>
                <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                  {isLoggedIn ? (session?.name || "Usuario") : "Sesión Cerrada"}
                </div>
                <div className="text-[10px] text-[#6e6e73] dark:text-[#86868b]">
                  {isLoggedIn
                    ? session?.username
                      ? `@${session.username}`
                      : session?.email && !session.email.endsWith("@numa.local") && !session.email.endsWith("@example.com")
                      ? session.email
                      : "Cuenta verificada"
                    : "Toca para iniciar"}
                </div>
              </div>
            </div>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="text-xs font-semibold text-[#D70015] dark:text-[#FF453A] px-2.5 py-1 rounded-lg border border-[#D70015]/30 hover:bg-[#D70015]/10"
              >
                Cerrar Sesión
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal("login");
                }}
                className="text-xs font-semibold text-[#0071E3] dark:text-[#2997ff] px-2.5 py-1 rounded-lg border border-[#0071E3]/30 hover:bg-[#0071E3]/10"
              >
                Iniciar Sesión
              </button>
            )}
          </div>

          {/* Quick Spotlight search button in mobile drawer */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#e8e8ed] dark:border-white/[0.06] text-xs text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#0071E3] dark:text-[#2997ff]" />
              <span>Buscar sección, acción o cuenta...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">⌘K</kbd>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 duration-100",
                    isActive
                      ? "bg-[#0071E3] text-white border-[#0071E3] shadow-sm font-semibold"
                      : "bg-black/[0.02] dark:bg-white/[0.04] border-[#e8e8ed] dark:border-white/[0.06] text-[#1d1d1f] dark:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openTransactionModal("expense");
              }}
              className="w-full text-xs font-semibold py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl shadow-xs"
              variant="primary"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nueva Transacción
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
