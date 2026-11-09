"use client";

import * as React from "react";
import {
  Send,
  Save,
  Check,
  Sparkles,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Download,
  RotateCcw,
  X,
  LogIn,
  LogOut,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  ShieldCheck,
  Key,
  Bot,
  Lock,
  AlertCircle,
  Trash2,
  Fingerprint,
  Clock,
  KeyRound,
  Pencil,
  User,
  Camera,
  Wallet,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CustomSelect } from "@/components/ui/custom-select";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { useSecurity } from "@/components/providers/security-provider";
import { PwaInstallCard } from "@/components/pwa/install-button";
import { AccountModal } from "@/components/modals/account-modal";

function GoogleLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.32 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.68 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

function TelegramLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#24A1DE"
        d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"
      />
      <path
        fill="#FFFFFF"
        d="M5.425 11.872l12.012-4.632c.556-.201 1.041.137.86.994l-2.045 9.638c-.15.68-.557.844-1.124.524l-3.13-2.308-1.51 1.454c-.167.167-.308.307-.63.307l.225-3.189 5.807-5.247c.253-.225-.055-.35-.392-.125l-7.177 4.519-3.093-.967c-.672-.21-.685-.672.147-.966z"
      />
    </svg>
  );
}

export default function SettingsPage() {
  const {
    accounts,
    transactions,
    subscriptions,
    budgets,
    goals,
    metrics,
    cashflowTrends,
    categoryExpenses,
    resetToDemoData,
    resetToCleanData,
    notify,
  } = useFinancialStore();

  const {
    isLoggedIn,
    session,
    login,
    logout,
    updateUserName,
    updateUsername,
    updateAvatar,
    biometricEnabled,
    toggleBiometric,
    openAuthModal,
    openForgotPasswordModal,
    twoFactor,
    telegramOtp,
    refreshTelegramOtp,
  } = useSecurity();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarBroken, setAvatarBroken] = React.useState(false);

  React.useEffect(() => {
    setAvatarBroken(false);
  }, [session?.avatarUrl]);

  const [togglingBio, setTogglingBio] = React.useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = React.useState(false);
  const [editedName, setEditedName] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [editNameError, setEditNameError] = React.useState<string | null>(null);

  // Edit Username (Requires 2FA) Modal State
  const [isEditUsernameModalOpen, setIsEditUsernameModalOpen] = React.useState(false);
  const [editedUsername, setEditedUsername] = React.useState("");
  const [editUsernameTotp, setEditUsernameTotp] = React.useState("");
  const [savingUsername, setSavingUsername] = React.useState(false);
  const [editUsernameError, setEditUsernameError] = React.useState<string | null>(null);

  const [is2FAModalOpen, setIs2FAModalOpen] = React.useState(false);
  const [twoFactorData, setTwoFactorData] = React.useState<{ secret: string; otpAuthUri: string; backupCodes: string[] } | null>(null);
  const [twoFactorCodeInput, setTwoFactorCodeInput] = React.useState("");
  const [twoFactorError, setTwoFactorError] = React.useState<string | null>(null);
  const [verifying2FA, setVerifying2FA] = React.useState(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);



  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("America/Panama");
  const [testingGemini, setTestingGemini] = React.useState(false);
  const [geminiStatus, setGeminiStatus] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  // Integrations Vault State
  const [integrationsStatus, setIntegrationsStatus] = React.useState<{
    telegram: {
      isConfigured: boolean;
      isSecuredWithUserId: boolean;
      maskedToken?: string;
      maskedUserId?: string;
      allowedUserId?: string;
      botUsername?: string;
      botName?: string;
      verifiedAt?: string;
    };
    gemini: {
      isConfigured: boolean;
      maskedApiKey?: string;
      model: string;
      verifiedAt?: string;
    };
    google?: {
      isConfigured: boolean;
      clientId?: string;
      maskedClientId?: string;
      verifiedAt?: string;
    };
    apple?: {
      isConfigured: boolean;
      clientId?: string;
      maskedClientId?: string;
      verifiedAt?: string;
    };
  } | null>(null);
  const [loadingIntegrations, setLoadingIntegrations] = React.useState(true);

  // Telegram Configuration Modal State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = React.useState(false);
  const [telegramTokenInput, setTelegramTokenInput] = React.useState("");
  const [telegramUserIdInput, setTelegramUserIdInput] = React.useState("");
  const [showTelegramToken, setShowTelegramToken] = React.useState(false);
  const [savingTelegram, setSavingTelegram] = React.useState(false);
  const [telegramError, setTelegramError] = React.useState<string | null>(null);
  const [telegramSuccess, setTelegramSuccess] = React.useState<{ botUsername: string; botName: string } | null>(null);

  // Gemini Configuration Modal State
  const [isGeminiModalOpen, setIsGeminiModalOpen] = React.useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = React.useState("");
  const [showGeminiKey, setShowGeminiKey] = React.useState(false);
  const [savingGemini, setSavingGemini] = React.useState(false);
  const [geminiError, setGeminiError] = React.useState<string | null>(null);
  const [geminiSuccess, setGeminiSuccess] = React.useState<string | null>(null);

  // In-App Confirmation Modal State (No native browser dialogs)
  const [confirmTarget, setConfirmTarget] = React.useState<
    "telegram" | "gemini" | "reset_clean" | "reset_demo" | "remove_avatar" | "unlink_2fa" | null
  >(null);
  const [confirmLoading, setConfirmLoading] = React.useState(false);

  // 2FA Management State & Handlers
  const [twoFactorEnrolled, setTwoFactorEnrolled] = React.useState(false);
  const [loading2FA, setLoading2FA] = React.useState(false);

  const displayUsername = React.useMemo(() => {
    if (session?.username) return session.username;
    if (session?.id === "usr_demo_user") return "demouser";
    if (session?.id === "usr_master_01") return "admin";
    if (session?.name) return session.name.toLowerCase().replace(/\s+/g, "");
    return "usuario";
  }, [session?.username, session?.id, session?.name]);

  const displayEmail = React.useMemo(() => {
    const raw = session?.email?.trim() || "";
    if (!raw || raw.endsWith("@numa.local") || raw.endsWith("@example.com")) {
      return "";
    }
    return raw;
  }, [session?.email]);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notify("La imagen supera el límite de 5MB.");
      return;
    }

    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const minDim = Math.min(img.width, img.height);
          const targetSize = Math.min(minDim, 256);
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setUploadingAvatar(false);
            return;
          }

          // Center crop
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          updateAvatar(compressed).then((ok) => {
            setUploadingAvatar(false);
            if (ok) {
              notify("Foto de perfil actualizada correctamente.");
            } else {
              notify("No se pudo guardar la foto de perfil.");
            }
          });
        } catch (err) {
          console.error("Error processing avatar:", err);
          setUploadingAvatar(false);
          notify("Error al procesar la imagen.");
        }
      };
      img.onerror = () => {
        setUploadingAvatar(false);
        notify("Formato de imagen inválido.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setConfirmTarget("remove_avatar");
  };

  const fetch2FAStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/2fa");
      const json = await res.json();
      if (json.success) {
        setTwoFactorEnrolled(Boolean(json.enrolled));
      }
    } catch (err) {
      console.warn("Could not fetch 2FA status:", err);
    }
  }, []);

  React.useEffect(() => {
    fetch2FAStatus();
  }, [fetch2FAStatus]);

  const handleStart2FASetup = async () => {
    setLoading2FA(true);
    setTwoFactorError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_setup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar configuración 2FA.");
      setTwoFactorData({ secret: data.secret, otpAuthUri: data.qrUri, backupCodes: [] });
      setTwoFactorCodeInput("");
      setIs2FAModalOpen(true);
    } catch (err: unknown) {
      notify((err as Error)?.message || "Error al solicitar configuración 2FA.");
    } finally {
      setLoading2FA(false);
    }
  };

  const handleConfirm2FASetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = twoFactorCodeInput.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setTwoFactorError("El código de seguridad debe tener exactamente 6 dígitos.");
      return;
    }
    setVerifying2FA(true);
    setTwoFactorError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_setup",
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto o expirado.");
      setTwoFactorEnrolled(true);
      setIs2FAModalOpen(false);
      notify("Google Authenticator vinculado exitosamente.");
    } catch (err: unknown) {
      setTwoFactorError((err as Error)?.message || "Error al validar código 2FA.");
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleUnlink2FA = () => {
    setConfirmTarget("unlink_2fa");
  };

  const fetchIntegrations = React.useCallback(async () => {
    try {
      setLoadingIntegrations(true);
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success && json.status) {
        setIntegrationsStatus(json.status);
      }
    } catch (err) {
      console.warn("Could not fetch integrations status:", err);
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  React.useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  React.useEffect(() => {
    try {
      const savedCurr = localStorage.getItem("vx-currency");
      const savedTz = localStorage.getItem("vx-timezone");
      if (savedCurr) setCurrency(savedCurr);
      if (savedTz) setTimezone(savedTz);
    } catch {}
  }, []);

  const handleSavePreferences = () => {
    try {
      localStorage.setItem("vx-currency", currency);
      localStorage.setItem("vx-timezone", timezone);
      setSavedNotice("Preferencias regionales guardadas con éxito.");
      notify("Preferencias regionales guardadas.");
      setTimeout(() => setSavedNotice(null), 3500);
    } catch {}
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiStatus(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "ping",
          userId: session?.id || "usr_master_01",
        }),
      });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        setGeminiStatus({
          ok: true,
          message: `Conexión activa • Latencia: ${elapsed}ms`,
        });
      } else {
        setGeminiStatus({
          ok: true,
          message: `Modo local activo • Latencia: ${elapsed}ms`,
        });
      }
    } catch (err: any) {
      setGeminiStatus({
        ok: false,
        message: `Error al conectar: ${err?.message || "Desconocido"}`,
      });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramError(null);
    setTelegramSuccess(null);
    setSavingTelegram(true);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "telegram",
          token: telegramTokenInput,
          allowedUserId: telegramUserIdInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo verificar el bot de Telegram");
      }
      setTelegramSuccess(data.data);
      notify(`Bot @${data.data.botUsername} conectado con éxito.`);
      fetchIntegrations();
    } catch (err: any) {
      setTelegramError(err?.message || "Error al configurar Telegram");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiError(null);
    setGeminiSuccess(null);
    setSavingGemini(true);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gemini",
          apiKey: geminiApiKeyInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo validar la API Key de Gemini");
      }
      setGeminiSuccess("Clave de Gemini configurada con éxito.");
      notify("API Key de Google Gemini guardada exitosamente.");
      fetchIntegrations();
      setTimeout(() => setIsGeminiModalOpen(false), 2000);
    } catch (err: any) {
      setGeminiError(err?.message || "Error al configurar Gemini");
    } finally {
      setSavingGemini(false);
    }
  };

  const handlePromptDisconnectTelegram = () => {
    setConfirmTarget("telegram");
  };

  const handlePromptDisconnectGemini = () => {
    setConfirmTarget("gemini");
  };

  const handlePromptResetClean = () => {
    setConfirmTarget("reset_clean");
  };

  const handlePromptResetDemo = () => {
    setConfirmTarget("reset_demo");
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);

    try {
      if (confirmTarget === "telegram") {
        const res = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disconnect_telegram" }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "No se pudo desconfigurar Telegram");
        }
        setTelegramTokenInput("");
        setTelegramUserIdInput("");
        setTelegramSuccess(null);
        setTelegramError(null);
        setIsTelegramModalOpen(false);
        notify("Bot de Telegram desconfigurado.");
        await fetchIntegrations();
      } else if (confirmTarget === "gemini") {
        const res = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disconnect_gemini" }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "No se pudo desconfigurar Gemini");
        }
        setGeminiApiKeyInput("");
        setGeminiSuccess(null);
        setGeminiError(null);
        setGeminiStatus(null);
        setIsGeminiModalOpen(false);
        notify("Google Gemini desconfigurado.");
        await fetchIntegrations();
      } else if (confirmTarget === "remove_avatar") {
        setUploadingAvatar(true);
        const ok = await updateAvatar("");
        setUploadingAvatar(false);
        if (ok) {
          notify("Foto de perfil eliminada.");
        }
      } else if (confirmTarget === "unlink_2fa") {
        setLoading2FA(true);
        const res = await fetch("/api/auth/2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unlink" }),
        });
        const data = await res.json();
        setLoading2FA(false);
        if (!res.ok) throw new Error(data.error || "Error al desvincular.");
        setTwoFactorEnrolled(false);
        notify("Autenticador 2FA desvinculado correctamente.");
      } else if (confirmTarget === "reset_clean") {
        resetToCleanData();
      } else if (confirmTarget === "reset_demo") {
        resetToDemoData();
      }
      setConfirmTarget(null);
    } catch (err: any) {
      notify(`Error: ${err?.message || "No se pudo completar la acción"}`);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      user: session?.name || "Usuario",
      company: "Acme",
      exportedAt: new Date().toISOString(),
      data: {
        metrics,
        accounts,
        transactions,
        subscriptions,
        budgets,
        savingsGoals: goals,
        cashflowTrends,
        categoryExpenses,
      },
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vx_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedNotice("Copia de seguridad descargada correctamente.");
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleCopyTelegramLink = () => {
    navigator.clipboard.writeText("https://t.me/FinlabAIBot?start=usr_master_01");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Configuración del Sistema</h2>
        <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b] mt-1">
          Preferencias de moneda, zona horaria, integraciones y seguridad del servidor.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#1D8348] dark:text-[#30D158] flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
          <button onClick={() => setSavedNotice(null)} className="text-xs underline hover:opacity-80">
            Cerrar
          </button>
        </div>
      )}

      {/* General Preferences */}
      <Card className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Preferencias Regionales</h3>
        <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mb-5">Determina el formato de importes monetarios y cálculo de periodos.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">Moneda Base Inicial</label>
            <CustomSelect
              value={currency}
              onChange={(val) => setCurrency(val)}
              modalTitle="Moneda Base Inicial"
              aria-label="Moneda Base Inicial"
              options={[
                {
                  value: "USD",
                  label: "Dólar Estadounidense (USD - $)",
                  description: "Moneda oficial de curso legal en Panamá y EE.UU.",
                  badge: "USD $",
                },
                {
                  value: "EUR",
                  label: "Euro (EUR - €)",
                  description: "Moneda oficial de la Zona Euro",
                  badge: "EUR €",
                },
                {
                  value: "PAB",
                  label: "Balboa Panameño (PAB - B/.)",
                  description: "Paridad 1:1 con el Dólar Estadounidense",
                  badge: "B/.",
                },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">Zona Horaria Oficial</label>
            <CustomSelect
              value={timezone}
              onChange={(val) => setTimezone(val)}
              modalTitle="Zona Horaria Oficial"
              aria-label="Zona Horaria Oficial"
              options={[
                {
                  value: "America/Panama",
                  label: "America/Panama (UTC-5)",
                  description: "Hora Estándar del Este — Panamá",
                  badge: "UTC-5",
                },
                {
                  value: "America/Bogota",
                  label: "America/Bogota (UTC-5)",
                  description: "Hora Estándar de Colombia",
                  badge: "UTC-5",
                },
                {
                  value: "UTC",
                  label: "Tiempo Universal Coordinado (UTC)",
                  description: "Estándar horario internacional",
                  badge: "UTC",
                },
              ]}
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#e8e8ed] dark:border-white/[0.06] flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSavePreferences}
            className="text-xs bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-full px-4"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" /> Guardar Preferencias
          </Button>
        </div>
      </Card>

      {/* Account Session Card */}
      <Card className="p-6 sm:p-7 md:p-8 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl md:rounded-[24px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Interactive Avatar Container */}
            <div className="relative group shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFile}
                className="hidden"
                aria-label="Subir foto de perfil"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-1 shadow-sm shrink-0 cursor-pointer overflow-hidden transition-all group-hover:ring-2 group-hover:ring-[#0071E3]/50 relative"
                title="Cambiar foto de perfil"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-7 w-7 text-[#0071E3] animate-spin" />
                ) : session?.avatarUrl && !avatarBroken ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={session.avatarUrl}
                    alt={session.name || "Foto de perfil"}
                    onError={() => setAvatarBroken(true)}
                    className="h-full w-full object-cover rounded-[14px] sm:rounded-[20px]"
                  />
                ) : (
                  <User className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 text-[#0071E3] dark:text-[#2997ff]" />
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl sm:rounded-3xl pointer-events-none">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Camera Trigger Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-md hover:bg-[#0066cc] transition-colors border-2 border-white dark:border-[#272729] cursor-pointer"
                title="Subir foto"
                aria-label="Subir foto"
              >
                <Camera className="h-3 w-3" />
              </button>

              {/* Delete Avatar button (if avatar exists) */}
              {session?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#D70015] text-white flex items-center justify-center shadow-md hover:bg-[#b00010] transition-colors border-2 border-white dark:border-[#272729] cursor-pointer"
                  title="Eliminar foto"
                  aria-label="Eliminar foto"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight">
                  {session?.name || "Usuario"}
                </div>
                <Badge variant="positive" className="text-[10px] py-0.5 px-2">
                  Activa
                </Badge>
                <button
                  type="button"
                  onClick={() => {
                    setEditedName(session?.name || "");
                    setEditNameError(null);
                    setIsEditNameModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-[#0071E3] dark:text-[#2997ff] hover:bg-[#0071E3]/10 transition-colors cursor-pointer"
                  title="Editar Nombre de Cuenta"
                  aria-label="Editar Nombre de Cuenta"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              {/* Username */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-semibold text-[#0071E3] dark:text-[#2997ff]">
                  @{displayUsername}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditedUsername(displayUsername);
                    setEditUsernameError(null);
                    setEditUsernameTotp("");
                    setIsEditUsernameModalOpen(true);
                  }}
                  className="p-1 rounded-md text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#0071E3] dark:hover:text-[#2997ff] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Cambiar Nombre de Usuario"
                  aria-label="Cambiar Nombre de Usuario"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {displayEmail ? (
                <div className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#a1a1a6] font-mono mt-0.5">
                  {displayEmail}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
              }}
              className="px-4 py-2 text-xs sm:text-sm rounded-full text-[#D70015] dark:text-[#FF453A] border-[#D70015]/30 hover:bg-[#D70015]/10 active:scale-[0.98] transition-all font-medium cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </Card>

      {/* Financial Accounts Management Card */}
      <Card className="p-6 sm:p-7 md:p-8 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl md:rounded-[24px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0071E3]/20 border border-[#0071E3]/20 flex items-center justify-center p-2 shadow-xs shrink-0">
              <Wallet className="h-6 w-6 text-[#0071E3] dark:text-[#2997ff]" />
            </div>
            <div>
              <div className="text-base font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <span>Cuentas Bancarias y Métodos de Pago</span>
              </div>
              <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                Agrega nuevas cuentas bancarias, billeteras o efectivo, y elimina las que ya no utilices.
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAccountModalOpen(true)}
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-[#0071E3] hover:bg-[#0066cc] text-white shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Administrar Cuentas</span>
          </Button>
        </div>
      </Card>

      {/* Advanced Security & Fingerprint Lock */}
      <Card className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-[#0071E3] dark:text-[#2997ff]" />
            <span>Seguridad y Huella Dactilar</span>
          </h3>
        </div>
        <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mb-5">
          Protección avanzada de máxima seguridad para tus balances, cuentas e información patrimonial.
        </p>

        <div className="space-y-4">
          {/* 1. Bloqueo por Huella Dactilar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-2 shadow-xs shrink-0">
                <Fingerprint className={`h-7 w-7 ${biometricEnabled ? "text-[#30D158]" : "text-[#0071E3] dark:text-[#2997ff]"}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Bloqueo por Huella Dactilar</span>
                  {biometricEnabled ? (
                    <Badge variant="positive" className="text-[10px] py-0.5 px-2">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[10px] py-0.5 px-2">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                  Inicia sesión rápidamente con tu huella dactilar en este dispositivo y mantén tu cuenta protegida.
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant={biometricEnabled ? "outline" : "primary"}
              size="sm"
              disabled={togglingBio}
              onClick={async () => {
                setTogglingBio(true);
                try {
                  const newState = await toggleBiometric();
                  notify(newState ? "Bloqueo por huella dactilar activado." : "Bloqueo por huella dactilar desactivado.");
                } catch (err: unknown) {
                  notify((err as Error)?.message || "No se completó la verificación de huella dactilar.");
                } finally {
                  setTogglingBio(false);
                }
              }}
              className="rounded-full text-xs shrink-0 self-start sm:self-auto font-medium"
            >
              {biometricEnabled ? "Desactivar" : "Activar Huella"}
            </Button>
          </div>

          {/* 2. Temporizador de Inactividad */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-2 shadow-xs shrink-0">
                <Clock className="h-6 w-6 text-[#FF9F0A]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <span>Auto-Bloqueo por Inactividad</span>
                </div>
                <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                  La sesión permanece abierta mientras interactúes. Tras un periodo de inactividad, se cierra la sesión automáticamente para proteger tus datos patrimoniales.
                </div>
              </div>
            </div>
            <div className="text-[11px] font-medium text-[#30D158] flex items-center gap-1.5 shrink-0 self-start sm:self-auto bg-[#30D158]/10 px-3 py-1.5 rounded-full border border-[#30D158]/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Protección Activa</span>
            </div>
          </div>

          {/* 3. Autenticación en Dos Pasos (2FA) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-2 shadow-xs shrink-0">
                <KeyRound className="h-6 w-6 text-[#0071E3] dark:text-[#2997ff]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Autenticación en Dos Pasos (2FA)</span>
                  <Badge variant={twoFactorEnrolled ? "positive" : "outline"} className="text-[10px] py-0.5 px-2">
                    {twoFactorEnrolled ? "Configurado" : "Sin configurar"}
                  </Badge>
                </div>
                <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                  {twoFactorEnrolled
                    ? "Doble factor de seguridad activo al iniciar sesión."
                    : "Sin protección de segundo factor activa."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
              {twoFactorEnrolled ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUnlink2FA}
                    disabled={loading2FA}
                    className="rounded-full text-xs font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 border-[#FF3B30]/30"
                  >
                    Desvincular 2FA
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleStart2FASetup}
                    disabled={loading2FA}
                    className="rounded-full text-xs font-medium bg-[#0071E3] hover:bg-[#0066cc] text-white"
                  >
                    Cambiar Dispositivo
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleStart2FASetup}
                  disabled={loading2FA}
                  className="rounded-full text-xs font-medium bg-[#0071E3] hover:bg-[#0066cc] text-white"
                >
                  Configurar 2FA
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Integrations: Telegram & Gemini */}
      <Card className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Integraciones del Sistema</h3>
        <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mb-5">
          Conexión con servicios externos y automatización por chat.
        </p>

        <div className="space-y-4">
          {/* Telegram Bot */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-2 shadow-xs shrink-0">
                <TelegramLogo className="h-7 w-7 shrink-0" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Bot de Telegram</span>
                  {integrationsStatus?.telegram.isConfigured ? (
                    <Badge variant="positive" className="text-[10px] py-0.5 px-2">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] py-0.5 px-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25">
                      Requiere Configuración
                    </Badge>
                  )}
                </div>
                {!integrationsStatus?.telegram.isConfigured && (
                  <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                    Configura tu Token y tu ID de usuario de Telegram para activar el bot.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
              {integrationsStatus?.telegram.isConfigured ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTelegramError(null);
                      setTelegramSuccess(null);
                      setIsTelegramModalOpen(true);
                    }}
                    className="text-xs rounded-full"
                  >
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    Reconfigurar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePromptDisconnectTelegram}
                    className="text-xs rounded-full text-[#FF453A] hover:bg-[#FF453A]/10 hover:border-[#FF453A]/30 border-[#e8e8ed] dark:border-white/[0.1]"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Desconfigurar
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setTelegramError(null);
                    setTelegramSuccess(null);
                    setIsTelegramModalOpen(true);
                  }}
                  className="text-xs rounded-full px-4 bg-[#0088cc] hover:bg-[#0077b5] text-white"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Conectar Bot
                </Button>
              )}
            </div>
          </div>

          {/* Gemini Intelligence */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-2.5 shadow-xs shrink-0">
                <GoogleLogo className="h-6 w-6 shrink-0" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Google Gemini Intelligence</span>
                  {integrationsStatus?.gemini.isConfigured ? (
                    <Badge variant="positive" className="text-[10px] py-0.5 px-2">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] py-0.5 px-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25">
                      Requiere API Key
                    </Badge>
                  )}
                </div>
                {!integrationsStatus?.gemini.isConfigured && (
                  <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1">
                    Ingresa tu API Key de Google AI Studio para análisis financiero y escaneo de facturas.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
              {geminiStatus && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    geminiStatus.ok
                      ? "bg-[#30D158]/15 text-[#1D8348] dark:text-[#30D158] border border-[#30D158]/30"
                      : "bg-[#FF453A]/15 text-[#D70015] dark:text-[#FF453A] border border-[#FF453A]/30"
                  }`}
                >
                  {geminiStatus.message}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGeminiError(null);
                  setGeminiSuccess(null);
                  setIsGeminiModalOpen(true);
                }}
                className="text-xs rounded-full"
              >
                <Key className="h-3.5 w-3.5 mr-1.5 text-[#0071e3] dark:text-[#2997ff]" />
                {integrationsStatus?.gemini.isConfigured ? "Cambiar API Key" : "Configurar API Key"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={testingGemini}
                onClick={handleTestGemini}
                className="text-xs rounded-full"
              >
                {testingGemini ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#0071e3] dark:text-[#2997ff]" />
                )}
                {testingGemini ? "Probando..." : "Probar Conexión"}
              </Button>
              {integrationsStatus?.gemini.isConfigured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePromptDisconnectGemini}
                  className="text-xs rounded-full text-[#FF453A] hover:bg-[#FF453A]/10 hover:border-[#FF453A]/30 border-[#e8e8ed] dark:border-white/[0.1]"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Desconfigurar
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* PWA Mobile Installation */}
      <Card className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Aplicación Móvil (PWA)</h3>
        <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mb-4">
          Instala numa en tu teléfono Android o iPhone para una experiencia nativa rápida, segura y a pantalla completa.
        </p>
        <PwaInstallCard />
      </Card>

      {/* Data Management & Backup */}
      <Card className="p-6 bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Copia de Seguridad y Datos</h3>
        <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mb-4">
          Exporta tu historial financiero activo en formato JSON o restaura los datos de demostración originales.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            className="text-xs rounded-full"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-[#0071e3] dark:text-[#2997ff]" />
            Descargar Backup JSON ({transactions.length} movs)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePromptResetDemo}
            className="text-xs rounded-full text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Restaurar Datos Iniciales
          </Button>
        </div>
      </Card>

      {/* Platform Credits */}
      <Card className="overflow-hidden bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] rounded-2xl md:rounded-[22px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-2 shadow-xs shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo.png"
                  alt="Logo VX"
                  className="h-8 w-auto max-w-[36px] object-contain drop-shadow-xs"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Créditos de la Plataforma
                  </h3>
                  <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-[#0071e3]/10 dark:bg-[#2997ff]/15 text-[#0071e3] dark:text-[#2997ff] border border-[#0071e3]/20 dark:border-[#2997ff]/25">
                    v2.4
                  </span>
                </div>
                <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                  Desarrollado por <span className="font-semibold text-[#1d1d1f] dark:text-white">Jacinto Santo</span> • Empresa: <span className="font-semibold text-[#0071e3] dark:text-[#2997ff]">V-Rax Company</span>
                </p>
              </div>
            </div>

            <a
              href="https://vraxcompany.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0066cc] text-white shadow-sm hover:shadow transition-all group shrink-0 active:scale-[0.98]"
            >
              <Globe className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
              <span>vraxcompany.com</span>
              <ExternalLink className="h-3 w-3 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </a>
          </div>
        </div>

        {/* Elegant Footer Strip */}
        <div className="px-5 sm:px-6 py-2.5 border-t border-[#e8e8ed] dark:border-white/[0.06] bg-[#f5f5f7]/60 dark:bg-black/20 text-[11px] text-[#6e6e73] dark:text-[#86868b]">
          <span>© 2026 V-Rax Company. Todos los derechos reservados.</span>
        </div>
      </Card>

      {/* Telegram Configuration Modal */}
      <Modal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        title="Conectar Bot de Telegram"
        description="Configura tu bot y tu ID de usuario de Telegram para registrar gastos."
        headerAccessory={
          <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-1 shadow-xs shrink-0">
            <TelegramLogo className="h-6 w-6 shrink-0" />
          </div>
        }
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-[#6e6e73] dark:text-[#86868b]">
          {/* Quick Guide */}
          <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[#e8e8ed] dark:border-white/[0.08] space-y-2">
            <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
              Pasos para conectar:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>
                Entra en{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0088cc] font-semibold underline hover:opacity-80 inline-flex items-center gap-0.5"
                >
                  @BotFather <ExternalLink className="h-2.5 w-2.5" />
                </a>
                , envía <code className="bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-mono">/newbot</code> y copia el token.
              </li>
              <li>
                Entra en{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0088cc] font-semibold underline hover:opacity-80 inline-flex items-center gap-0.5"
                >
                  @userinfobot <ExternalLink className="h-2.5 w-2.5" />
                </a>
                , presiona Iniciar y copia tu ID numérico.
              </li>
            </ol>
          </div>

          {telegramError && (
            <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#D70015] dark:text-[#FF453A] flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{telegramError}</span>
            </div>
          )}

          {telegramSuccess && (
            <div className="p-3.5 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#1D8348] dark:text-[#30D158] flex items-start gap-2.5 text-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>¡Bot verificado exitosamente!</strong>
                <p className="mt-0.5">
                  Tu bot <strong className="font-mono">@{telegramSuccess.botUsername}</strong> está listo y vinculado a tu cuenta.
                </p>
                <a
                  href={`https://t.me/${telegramSuccess.botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0088cc] text-white text-xs font-semibold"
                >
                  <Send className="h-3.5 w-3.5" /> Abrir @{telegramSuccess.botUsername} en Telegram
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveTelegram} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-white mb-1">
                Token del Bot
              </label>
              <div className="relative">
                <input
                  type={showTelegramToken ? "text" : "password"}
                  value={telegramTokenInput}
                  onChange={(e) => setTelegramTokenInput(e.target.value)}
                  placeholder="ej. 7123456789:AAHkL7z9mX..."
                  className="w-full pr-10 pl-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]/40 focus:border-[#0088cc] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowTelegramToken(!showTelegramToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white"
                  title={showTelegramToken ? "Ocultar Token" : "Mostrar Token"}
                >
                  {showTelegramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-white mb-1">
                ID de Usuario de Telegram
              </label>
              <input
                type="text"
                value={telegramUserIdInput}
                onChange={(e) => setTelegramUserIdInput(e.target.value.replace(/\D/g, ""))}
                placeholder="ej. 591234567"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]/40 focus:border-[#0088cc] transition-all"
                required
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e8ed] dark:border-white/[0.06]">
              {integrationsStatus?.telegram.isConfigured ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePromptDisconnectTelegram}
                  className="text-xs rounded-full text-[#FF453A] hover:bg-[#FF453A]/10 hover:border-[#FF453A]/30 border-[#e8e8ed] dark:border-white/[0.1]"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Desconfigurar
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="text-xs rounded-full"
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingTelegram || !telegramTokenInput.trim() || !telegramUserIdInput.trim()}
                  className="text-xs bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-full px-5"
                >
                  {savingTelegram ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Conectar Bot
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Gemini Configuration Modal */}
      <Modal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        title="Configurar Google Gemini Intelligence"
        description="Activa el motor de IA multimodal para escaneo de tickets y análisis de gastos."
        headerAccessory={
          <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-1.5 shadow-xs shrink-0">
            <GoogleLogo className="h-5 w-5 shrink-0" />
          </div>
        }
        maxWidth="lg"
      >
        <div className="space-y-5 text-xs text-[#6e6e73] dark:text-[#86868b]">
          {/* Guide Card */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[#e8e8ed] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1d1d1f] dark:text-white">
              <Key className="h-4 w-4 text-[#0071e3]" />
              <span>Cómo obtener tu API Key gratuita de Google Gemini:</span>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed">
              <li>
                Abre{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0071e3] font-semibold underline hover:opacity-80 inline-flex items-center gap-0.5"
                >
                  Google AI Studio (aistudio.google.com/apikey) <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                con tu cuenta de Google.
              </li>
              <li>
                Haz clic en el botón azul <strong className="text-[#1d1d1f] dark:text-white">Create API key</strong>.
              </li>
              <li>
                Copia la clave generada (empieza por <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono">AIzaSy...</code>) y pégala abajo.
              </li>
            </ol>
          </div>

          {geminiError && (
            <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#D70015] dark:text-[#FF453A] flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{geminiError}</span>
            </div>
          )}

          {geminiSuccess && (
            <div className="p-3.5 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#1D8348] dark:text-[#30D158] flex items-center gap-2.5 text-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{geminiSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveGemini} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-white mb-1">
                API Key de Google Gemini
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="ej. AIzaSy..."
                  className="w-full pr-10 pl-3.5 py-2 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white"
                  title={showGeminiKey ? "Ocultar Clave" : "Mostrar Clave"}
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e8ed] dark:border-white/[0.06]">
              {integrationsStatus?.gemini.isConfigured ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePromptDisconnectGemini}
                  className="text-xs rounded-full text-[#FF453A] hover:bg-[#FF453A]/10 hover:border-[#FF453A]/30 border-[#e8e8ed] dark:border-white/[0.1]"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Desconfigurar
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGeminiModalOpen(false)}
                  className="text-xs rounded-full"
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingGemini || !geminiApiKeyInput.trim()}
                  className="text-xs bg-[#0071E3] hover:bg-[#0066cc] text-white rounded-full px-5"
                >
                  {savingGemini ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Validando con Google...
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      Guardar API Key
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Username Modal */}
      <Modal
        isOpen={isEditUsernameModalOpen}
        onClose={() => setIsEditUsernameModalOpen(false)}
        title="Cambiar Nombre de Usuario"
        description={
          twoFactorEnrolled
            ? "Por seguridad, cambiar tu nombre de usuario requiere confirmación con tu código 2FA."
            : "Actualiza tu identificador único de usuario para iniciar sesión."
        }
        headerAccessory={
          <div className="h-9 w-9 rounded-xl bg-[#0071E3]/10 dark:bg-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997ff] shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
        }
        maxWidth="sm"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const cleanUser = editedUsername.trim().toLowerCase();
            if (!cleanUser || cleanUser.length < 3) {
              setEditUsernameError("El usuario debe tener al menos 3 caracteres.");
              return;
            }
            if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
              setEditUsernameError("Solo se permiten letras, números, puntos y guiones.");
              return;
            }
            if (twoFactorEnrolled && !editUsernameTotp.trim()) {
              setEditUsernameError("Introduce tu código 2FA de 6 dígitos.");
              return;
            }

            setSavingUsername(true);
            setEditUsernameError(null);
            try {
              const res = await updateUsername(cleanUser, editUsernameTotp.trim());
              if (!res.success) {
                setEditUsernameError(res.error || "No se pudo actualizar el usuario.");
                return;
              }
              notify(`Nombre de usuario actualizado a @${cleanUser}`);
              setIsEditUsernameModalOpen(false);
            } catch (err: unknown) {
              setEditUsernameError((err as Error)?.message || "Error al actualizar el usuario.");
            } finally {
              setSavingUsername(false);
            }
          }}
          className="space-y-4 pt-1"
        >
          {editUsernameError && (
            <div className="p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] dark:text-[#FF453A] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editUsernameError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              Nuevo Usuario
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#86868b]">@</span>
              <input
                type="text"
                required
                autoFocus
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value.toLowerCase().trim())}
                placeholder="ej. usuario"
                className="w-full px-3.5 py-2.5 pl-7 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all font-mono"
              />
            </div>
          </div>

          {twoFactorEnrolled && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] flex items-center justify-between">
                <span>Código 2FA de Seguridad</span>
                <span className="text-[10px] text-[#0071E3] dark:text-[#2997ff]">Google Authenticator</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={editUsernameTotp}
                onChange={(e) => setEditUsernameTotp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full px-3.5 py-2.5 text-center tracking-widest text-sm rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all font-mono"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-[#e8e8ed] dark:border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditUsernameModalOpen(false)}
              className="flex-1 py-2 text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingUsername || !editedUsername.trim() || (twoFactorEnrolled && editUsernameTotp.length < 6)}
              className="flex-1 py-2 text-xs rounded-xl bg-[#0071E3] hover:bg-[#0066cc] text-white flex items-center justify-center gap-2 font-semibold"
            >
              {savingUsername && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Confirmar Cambio</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Two-Factor Authentication (2FA) Setup Modal */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        maxWidth="md"
        title="Vincular Google Authenticator (2FA)"
        description="Escanea el código QR o introduce la clave secreta manual en Google Authenticator o Microsoft Authenticator."
        headerAccessory={
          <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-1.5 shadow-xs shrink-0">
            <KeyRound className="h-5 w-5 text-[#0071E3] dark:text-[#2997ff] shrink-0" />
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          {twoFactorError && (
            <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-xs text-[#D70015] dark:text-[#FF453A] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{twoFactorError}</span>
            </div>
          )}

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-black/[0.02] dark:bg-white/[0.04] rounded-2xl border border-[#e8e8ed] dark:border-white/[0.08]">
            {twoFactorData?.otpAuthUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(
                  twoFactorData.otpAuthUri
                )}`}
                alt="Código QR 2FA"
                className="h-36 w-36 rounded-xl object-contain bg-white p-1 shadow-2xs"
              />
            ) : (
              <div className="h-36 w-36 flex items-center justify-center text-xs text-[#86868b]">Cargando QR...</div>
            )}
            <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b] mt-2 text-center">
              Abre Google Authenticator y escanea este código interactivo.
            </p>
          </div>

          {/* Secret Key Box */}
          <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#e8e8ed] dark:border-white/[0.08]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] dark:text-white mb-1.5">
              <span>Clave Secreta Base32 (Manual):</span>
              <button
                type="button"
                onClick={() => {
                  if (twoFactorData?.secret) {
                    navigator.clipboard.writeText(twoFactorData.secret);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] text-[#0071E3] dark:text-[#2997ff] hover:underline cursor-pointer"
              >
                {copiedSecret ? <Check className="h-3.5 w-3.5 text-[#30D158]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSecret ? "Copiado" : "Copiar clave"}</span>
              </button>
            </div>
            <div className="font-mono text-xs tracking-widest text-[#0071E3] dark:text-[#2997ff] bg-white dark:bg-black/20 p-2 rounded-lg border border-[#e8e8ed] dark:border-white/[0.06] select-all">
              {twoFactorData?.secret ? (twoFactorData.secret.match(/.{1,4}/g)?.join(" ") || twoFactorData.secret) : "•••• •••• •••• ••••"}
            </div>
          </div>

          {/* Verification Code Input Form */}
          <form
            onSubmit={handleConfirm2FASetup}
            className="space-y-3 pt-1 border-t border-[#e8e8ed] dark:border-white/[0.06]"
          >
            <div>
              <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1 text-center">
                Código temporal de 6 dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={twoFactorCodeInput}
                onChange={(e) => setTwoFactorCodeInput(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full text-center text-lg font-mono tracking-widest py-2 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white focus:outline-hidden focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIs2FAModalOpen(false)}
                className="text-xs rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={verifying2FA || twoFactorCodeInput.trim().length !== 6}
                className="text-xs rounded-full bg-[#0071E3] hover:bg-[#0066cc] text-white"
              >
                {verifying2FA ? "Validando..." : "Verificar y Guardar"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Custom In-App Confirmation Modal (Apple HIG Design) */}
      <Modal
        isOpen={confirmTarget !== null}
        onClose={() => !confirmLoading && setConfirmTarget(null)}
        title={
          confirmTarget === "telegram"
            ? "¿Desconfigurar Bot de Telegram?"
            : confirmTarget === "gemini"
            ? "¿Desconfigurar Google Gemini?"
            : confirmTarget === "remove_avatar"
            ? "¿Eliminar Foto de Perfil?"
            : confirmTarget === "unlink_2fa"
            ? "¿Desvincular Autenticador 2FA?"
            : confirmTarget === "reset_clean"
            ? "¿Vaciar Todo el Sistema ($0.00 Limpio)?"
            : "¿Restaurar Datos de Demostración?"
        }
        description={
          confirmTarget === "telegram"
            ? "Se eliminarán las credenciales vinculadas. El bot dejará de recibir y registrar gastos por chat."
            : confirmTarget === "gemini"
            ? "Se eliminará la API Key guardada. El análisis inteligente y el escaneo de facturas quedarán inactivos."
            : confirmTarget === "remove_avatar"
            ? "Se eliminará tu foto de perfil actual y volverá al icono predeterminado de usuario."
            : confirmTarget === "unlink_2fa"
            ? "Se desvinculará tu aplicación de autenticación actual en dos pasos."
            : confirmTarget === "reset_clean"
            ? "Se restablecerán todos los balances a $0.00 y se eliminarán todas las transacciones, presupuestos y metas para iniciar completamente desde cero."
            : "Se cargarán datos de ejemplo con transacciones y presupuestos ficticios para evaluar la plataforma."
        }
        headerAccessory={
          <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/[0.06] border border-[#e8e8ed] dark:border-white/[0.1] flex items-center justify-center p-1.5 shadow-xs shrink-0">
            {confirmTarget === "telegram" ? (
              <TelegramLogo className="h-6 w-6 shrink-0" />
            ) : confirmTarget === "gemini" ? (
              <GoogleLogo className="h-5 w-5 shrink-0" />
            ) : confirmTarget === "reset_clean" || confirmTarget === "remove_avatar" || confirmTarget === "unlink_2fa" ? (
              <Trash2 className="h-4 w-4 text-[#FF453A]" />
            ) : (
              <RotateCcw className="h-4 w-4 text-[#0071E3]" />
            )}
          </div>
        }
        maxWidth="sm"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#D70015] dark:text-[#FF453A] text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {confirmTarget === "reset_clean"
                ? "Esta acción borrará todas las transacciones y pondrá las cuentas en $0.00 de manera irreversible."
                : confirmTarget === "reset_demo"
                ? "Esta acción reemplazará los datos actuales por los datos originales de demostración."
                : "Esta acción es inmediata. Podrás volver a configurar tus opciones en cualquier momento."}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e8ed] dark:border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={confirmLoading}
              onClick={() => setConfirmTarget(null)}
              className="text-xs rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={confirmLoading}
              onClick={handleConfirmAction}
              className="text-xs bg-[#FF453A] hover:bg-[#D70015] active:bg-[#B3000E] text-white rounded-full px-4 shadow-sm"
            >
              {confirmLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Procesando...
                </>
              ) : confirmTarget === "reset_clean" ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Vaciar Todo a $0.00
                </>
              ) : confirmTarget === "reset_demo" ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Restaurar Datos
                </>
              ) : confirmTarget === "remove_avatar" ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Eliminar Foto
                </>
              ) : confirmTarget === "unlink_2fa" ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Desvincular 2FA
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Desconfigurar
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Name Modal */}
      <Modal
        isOpen={isEditNameModalOpen}
        onClose={() => setIsEditNameModalOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#0071E3] dark:text-[#2997ff]" />
            <span>Editar Nombre de Cuenta</span>
          </div>
        }
        description="Actualiza el nombre que se muestra en tu perfil y panel financiero."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editedName.trim()) {
              setEditNameError("El nombre no puede estar vacío.");
              return;
            }
            setSavingName(true);
            setEditNameError(null);
            try {
              await updateUserName(editedName.trim());
              notify("Nombre actualizado con éxito.");
              setIsEditNameModalOpen(false);
            } catch (err: unknown) {
              setEditNameError((err as Error)?.message || "Error al actualizar el nombre.");
            } finally {
              setSavingName(false);
            }
          }}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                autoComplete="off"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Ej. Tu Nombre"
                className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
              />
            </div>
          </div>

          {editNameError && (
            <div className="p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] dark:text-[#FF453A] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editNameError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t border-[#e8e8ed] dark:border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditNameModalOpen(false)}
              className="flex-1 py-2 text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={savingName || !editedName.trim()}
              className="flex-1 py-2 text-xs rounded-xl bg-[#0071E3] hover:bg-[#0066cc] text-white flex items-center justify-center gap-2 font-semibold"
            >
              {savingName && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Guardar Nombre</span>
            </Button>
          </div>
        </form>
      </Modal>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
}
