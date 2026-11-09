"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck, Check, AlertCircle } from "lucide-react";

export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function AppleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.05-7.64-7.85-11.87-14.39-6.09-9.35-10.88-19.8-14.37-31.36-3.48-11.55-5.23-22.39-5.23-32.52 0-14.39 3.59-26.4 10.77-36.03 7.18-9.63 16.27-14.54 27.27-14.75 4.8 0 10.13 1.24 16 3.73 5.87 2.49 9.68 3.79 11.44 3.9 1.63-.22 5.67-1.57 12.13-4.04 6.46-2.48 11.98-3.62 16.57-3.43 12.44.65 22.42 5.43 29.93 14.34-10.89 6.53-16.22 15.56-16 27.1 0 8.7 3.27 16.09 9.8 22.18 6.53 6.09 14.38 9.53 23.56 10.33-2.61 7.84-5.66 15.78-9.15 23.82zM119.22 33.15c0-7.18 2.51-13.93 7.53-20.25 5.02-6.32 11.33-10.46 18.93-12.41.22 1.3.33 2.5.33 3.59 0 7.07-2.67 13.88-8.01 20.43-5.34 6.54-11.75 10.4-19.23 11.59-.44-.98-.55-1.96-.55-2.95z" />
    </svg>
  );
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
  onSuccess: (user: any) => void;
  onOpenForgotPassword?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login",
  onSuccess,
  onOpenForgotPassword,
}: AuthModalProps) {
  const [tab, setTab] = React.useState<"login" | "register">(defaultTab);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [oauthPromptProvider, setOauthPromptProvider] = React.useState<"google" | "apple" | null>(null);
  const [oauthCustomName, setOauthCustomName] = React.useState("");

  React.useEffect(() => {
    setTab("login");
    setError(
      defaultTab === "register"
        ? "La creación de nuevas cuentas estará disponible próximamente."
        : null
    );
    setOauthPromptProvider(null);
  }, [defaultTab, isOpen]);

  // Password entropy calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0..4
  };

  const passwordScore = getPasswordStrength(password);
  const strengthLabels = ["Muy débil", "Débil", "Regular", "Buena", "Excelente"];
  const strengthColors = ["bg-[#FF453A]", "bg-[#FF9F0A]", "bg-[#FFD60A]", "bg-[#30D158]", "bg-[#30D158]"];

  const handleStartOAuth = (provider: "google" | "apple") => {
    setError(null);
    setOauthCustomName("");
    setOauthPromptProvider(provider);
  };

  const handleConfirmOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthCustomName.trim()) {
      setError("Por favor ingresa tu nombre.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const endpoint = oauthPromptProvider === "google" ? "/api/auth/google" : "/api/auth/apple";
      const payload =
        oauthPromptProvider === "google"
          ? {
              email: "admin@example.com",
              name: oauthCustomName.trim(),
              googleId: "gid_master_acme_2026",
              avatarUrl: "https://example.com/avatar.png",
            }
          : {
              email: "admin@privaterelay.appleid.com",
              name: oauthCustomName.trim(),
              appleId: "apple_sub_acme_master",
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error al conectar con ${oauthPromptProvider === "google" ? "Google" : "Apple"}.`);

      onSuccess(data.user);
      setOauthPromptProvider(null);
      onClose();
    } catch (e: unknown) {
      setError((e as Error)?.message || "Error al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "register") {
      if (!name.trim()) {
        setError("Por favor ingresa tu nombre completo.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener mínimo 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = tab === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        tab === "register"
          ? { name, email, password }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al procesar la solicitud.");
      }

      onSuccess(data.user);
      onClose();
    } catch (e: unknown) {
      setError((e as Error)?.message || "Error de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          {oauthPromptProvider ? (
            oauthPromptProvider === "google" ? <GoogleIcon className="h-5 w-5" /> : <AppleIcon className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-[#0071E3] dark:text-[#2997ff]" />
          )}
          <span>
            {oauthPromptProvider
              ? "¿Cuál es tu nombre?"
              : tab === "login"
              ? "Iniciar Sesión"
              : "Crear Cuenta"}
          </span>
        </div>
      }
      description={
        oauthPromptProvider
          ? `Personaliza tu perfil de acceso para continuar con ${oauthPromptProvider === "google" ? "Google" : "Apple"}.`
          : "Acceso seguro y protegido a tus finanzas personales numa."
      }
    >
      {oauthPromptProvider ? (
        <form onSubmit={handleConfirmOAuth} className="space-y-4" autoComplete="off">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              Tu Nombre Completo
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                autoComplete="off"
                value={oauthCustomName}
                onChange={(e) => setOauthCustomName(e.target.value)}
                placeholder="Ej. Admin User"
                className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-xs text-[#D70015] dark:text-[#FF453A] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-[#e8e8ed] dark:border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setOauthPromptProvider(null);
              }}
              className="flex-1 py-2 text-xs rounded-xl"
            >
              Volver
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !oauthCustomName.trim()}
              className="flex-1 py-2 text-xs rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center justify-center gap-2 font-semibold"
            >
              {loading && <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Entrar</span>
            </Button>
          </div>
        </form>
      ) : (
        <>
          {/* Segmented Tab Switcher */}
          <div className="flex p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.08] mb-5">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
              }}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all bg-white dark:bg-[#1f1f21] text-[#1d1d1f] dark:text-white shadow-xs"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("La creación de nuevas cuentas estará disponible próximamente.");
              }}
              className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Crear Cuenta</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b]">
                Próx.
              </span>
            </button>
          </div>

          {/* Social Logins */}
          <div className="space-y-2.5 mb-5">
            {/* Google Direct Registration Button */}
            <button
              type="button"
              onClick={() => handleStartOAuth("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#e8e8ed] dark:border-white/[0.12] bg-white dark:bg-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.08] text-xs font-semibold text-[#1d1d1f] dark:text-white transition-all active:scale-[0.99] shadow-2xs disabled:opacity-50"
            >
              <GoogleIcon className="h-4 w-4 shrink-0" />
              <span>{tab === "register" ? "Registrarse directo con Google" : "Continuar con Google"}</span>
            </button>
          </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e8e8ed] dark:border-white/[0.08]" />
        </div>
        <span className="relative px-3 bg-white dark:bg-[#272729] text-[11px] font-medium text-[#6e6e73] dark:text-[#86868b]">
          o con tu correo electrónico
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-xs text-[#D70015] dark:text-[#FF453A] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {tab === "register" && (
          <div>
            <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Admin User"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-hidden focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@example.com"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-hidden focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-[#6e6e73] dark:text-[#86868b]">
              Contraseña
            </label>
            {tab === "login" && onOpenForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenForgotPassword();
                }}
                className="text-[11px] font-semibold text-[#0071E3] dark:text-[#2997ff] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-hidden focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password Entropy Meter (Only in Register tab) */}
          {tab === "register" && password.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#6e6e73] dark:text-[#86868b]">Seguridad de la clave:</span>
                <span className="font-semibold text-[#1d1d1f] dark:text-white">
                  {strengthLabels[passwordScore]}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 rounded-full transition-all ${
                      level <= passwordScore
                        ? strengthColors[passwordScore]
                        : "bg-black/10 dark:bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {tab === "register" && (
          <div>
            <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-hidden focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full mt-2 h-10 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-xs"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Procesando...</span>
            </span>
          ) : tab === "login" ? (
            "Iniciar Sesión"
          ) : (
            "Crear Mi Cuenta"
          )}
        </Button>
      </form>
      </>
      )}
    </Modal>
  );
}
