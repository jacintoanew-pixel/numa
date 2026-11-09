"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSecurity } from "@/components/providers/security-provider";
import { GoogleIcon } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  QrCode,
  Copy,
  Check,
  Sun,
  Moon,
  Sparkles,
  Smartphone,
  User,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import {
  isFingerprintAvailable,
  verifyFingerprint,
  registerFingerprintCredential,
} from "@/lib/auth/webauthn";

interface TwoFactorData {
  userId: string;
  challengeId?: string;
  email: string;
  name: string;
  enrolled: boolean;
  secret?: string;
  qrUri?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, login, openForgotPasswordModal } = useSecurity();

  // Mode: "biometric" (if enrolled on this device) vs "credentials" vs "2fa" vs "enroll_biometric"
  const [viewMode, setViewMode] = React.useState<"biometric" | "credentials" | "2fa" | "enroll_biometric">("credentials");
  const [hasBiometricEnrolled, setHasBiometricEnrolled] = React.useState(false);
  const [supportsBiometric, setSupportsBiometric] = React.useState(false);
  const [bioUserName, setBioUserName] = React.useState("");
  const [bioUserHandle, setBioUserHandle] = React.useState("");
  const [bioUserAvatar, setBioUserAvatar] = React.useState("");

  // Form states
  const [authType, setAuthType] = React.useState<"login" | "register">("login");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [totpCode, setTotpCode] = React.useState("");
  const [twoFactorData, setTwoFactorData] = React.useState<TwoFactorData | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = React.useState<any>(null);

  // Register Form states
  const [regName, setRegName] = React.useState("");
  const [regIdentifier, setRegIdentifier] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regConfirmPassword, setRegConfirmPassword] = React.useState("");
  const [showRegPassword, setShowRegPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);

  // Check device biometric capabilities on mount
  React.useEffect(() => {
    isFingerprintAvailable().then((supported) => {
      setSupportsBiometric(supported);
      if (supported && typeof window !== "undefined") {
        const isEnrolled =
          localStorage.getItem("numa_bio_enrolled") === "true" ||
          localStorage.getItem("vx_bio_enabled") === "true" ||
          Boolean(localStorage.getItem("numa_bio_cred_id")) ||
          Boolean(localStorage.getItem("vx_bio_cred_id"));

        if (isEnrolled) {
          setHasBiometricEnrolled(true);
          const storedCredId =
            localStorage.getItem("numa_bio_cred_id") || localStorage.getItem("vx_bio_cred_id");
          const storedName = localStorage.getItem("numa_bio_user_name");
          const storedHandle = localStorage.getItem("numa_bio_user_handle") || "";
          const storedAvatar = localStorage.getItem("numa_bio_user_avatar") || "";

          if (storedName && storedName !== "Usuario Vinculado") {
            setBioUserName(storedName);
            setBioUserHandle(storedHandle);
            setBioUserAvatar(storedAvatar);
          }

          setViewMode("biometric");

          // Resolve exact owner profile from server by credentialId (independent per user/device)
          if (storedCredId) {
            fetch("/api/auth/biometrics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "lookup_device",
                credentialId: storedCredId,
              }),
            })
              .then(async (r) => {
                if (!r.ok) return { invalid: true };
                const json = await r.json();
                return json;
              })
              .then((data) => {
                if (data?.invalid || data?.requiresReenroll) {
                  // Credential was purged or lacks real WebAuthn SPKI key -> clear local stale cred so user re-enrolls after 2FA
                  try {
                    localStorage.removeItem("numa_bio_enrolled");
                    localStorage.removeItem("numa_bio_cred_id");
                    localStorage.removeItem("vx_bio_enabled");
                    localStorage.removeItem("vx_bio_cred_id");
                  } catch {}
                  setHasBiometricEnrolled(false);
                  setViewMode("credentials");
                  return;
                }
                if (data?.success && data?.profile?.name) {
                  setBioUserName(data.profile.name);
                  setBioUserHandle(data.profile.username || "");
                  setBioUserAvatar(data.profile.avatarUrl || "");
                  try {
                    localStorage.setItem("numa_bio_user_name", data.profile.name);
                    localStorage.setItem("numa_bio_user_handle", data.profile.username || "");
                    localStorage.setItem("numa_bio_user_avatar", data.profile.avatarUrl || "");
                  } catch {}
                }
              })
              .catch(() => {});
          }
        }
      }
    });
  }, []);

  // Biometric 1-Tap Login
  const handleBiometricLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const storedCredId =
        (typeof window !== "undefined" &&
          (localStorage.getItem("numa_bio_cred_id") || localStorage.getItem("vx_bio_cred_id"))) ||
        undefined;

      const resBio = await verifyFingerprint(storedCredId);
      if (!resBio.success) {
        setError("Lectura de huella no completada o cancelada.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/biometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_login",
          credentialId: resBio.credentialId || storedCredId,
          challengeToken: resBio.challengeToken,
          authenticatorData: resBio.authenticatorData,
          clientDataJSON: resBio.clientDataJSON,
          signature: resBio.signature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem("numa_bio_enrolled");
            localStorage.removeItem("numa_bio_cred_id");
            localStorage.removeItem("vx_bio_enabled");
            localStorage.removeItem("vx_bio_cred_id");
          } catch {}
          setHasBiometricEnrolled(false);
          setViewMode("credentials");
          throw new Error(
            "Por seguridad (actualización WebAuthn), inicia sesión con tu contraseña y código 2FA una vez para volver a vincular tu huella."
          );
        }
        throw new Error(data.error || "No se pudo validar la huella dactilar.");
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("numa_splashed", "true");
          if (data.user?.name) {
            localStorage.setItem("numa_bio_user_name", data.user.name);
            localStorage.setItem("numa_bio_user_handle", data.user.username || "");
            localStorage.setItem("numa_bio_user_avatar", data.user.avatarUrl || "");
          }
        } catch {}
      }
      completeLogin(data.user);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Error al verificar huella.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Por favor ingresa tu usuario o correo electrónico.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña ingresada es demasiado corta.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Credenciales incorrectas.");
      }

      if (data.requires2FA) {
        setTwoFactorData({
          userId: data.userId,
          challengeId: data.challengeId,
          email: data.email,
          name: data.name,
          enrolled: data.enrolled,
          secret: data.secret,
          qrUri: data.qrUri,
        });
        setViewMode("2fa");
        setTotpCode("");
        return;
      }

      // Direct login if 2FA was not active
      completeLogin(data.user);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  };

  // Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = regName.trim();
    const cleanId = regIdentifier.trim();
    if (!cleanName) {
      setError("Por favor ingresa tu nombre completo.");
      return;
    }
    if (!cleanId) {
      setError("Por favor ingresa un correo o nombre de usuario.");
      return;
    }
    if (regPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanId,
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear la cuenta.");
      }

      completeLogin(data.user);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Error al registrar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit 2FA Code
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorData?.userId) return;

    const cleanCode = totpCode.trim().replace(/\D/g, "");
    if (!/^\d{6}$/.test(cleanCode)) {
      setError("El código de seguridad debe tener exactamente 6 dígitos numéricos.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_2fa",
          userId: twoFactorData.userId,
          challengeId: twoFactorData.challengeId,
          totpCode: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Código 2FA incorrecto o expirado.");
      }

      // Update local user profile cache if enrolled
      if (typeof window !== "undefined" && hasBiometricEnrolled) {
        try {
          const handle =
            data.user.username ||
            (data.user.id === "usr_master_01"
              ? "admin"
              : data.user.id === "usr_demo_user"
              ? "demouser"
              : (data.user.name || "usuario").toLowerCase().replace(/\s+/g, ""));
          localStorage.setItem("numa_bio_user_name", data.user.name || "Usuario");
          localStorage.setItem("numa_bio_user_handle", handle);
          localStorage.setItem("numa_bio_user_avatar", data.user.avatarUrl || "");
        } catch {}
      }

      // If device supports biometrics and not enrolled yet, prompt user
      if (supportsBiometric && !hasBiometricEnrolled) {
        setAuthenticatedUser(data.user);
        setViewMode("enroll_biometric");
        return;
      }

      completeLogin(data.user);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Error al verificar código 2FA.");
    } finally {
      setLoading(false);
    }
  };

  // Complete Login and go to dashboard
  const completeLogin = (user: any) => {
    login(user);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("numa_splashed", "true");
      } catch {}
      window.location.replace("/dashboard");
      return;
    }
    router.replace("/dashboard");
  };

  // Enroll Biometrics Post-Login
  const handleEnrollBiometrics = async () => {
    if (!authenticatedUser) return;
    setError(null);
    setLoading(true);
    try {
      const cred = await registerFingerprintCredential(
        authenticatedUser.id,
        authenticatedUser.name || "Usuario"
      );

      if (cred) {
        const handle =
          authenticatedUser.username ||
          (authenticatedUser.id === "usr_master_01"
            ? "admin"
            : authenticatedUser.id === "usr_demo_user"
            ? "demouser"
            : (authenticatedUser.name || "usuario").toLowerCase().replace(/\s+/g, ""));
        localStorage.setItem("numa_bio_enrolled", "true");
        localStorage.setItem("numa_bio_cred_id", cred.credentialId);
        localStorage.setItem("numa_bio_user_name", authenticatedUser.name || "Usuario");
        localStorage.setItem("numa_bio_user_handle", handle);
        localStorage.setItem("numa_bio_user_avatar", authenticatedUser.avatarUrl || "");
        localStorage.setItem("vx_bio_enabled", "true");
        localStorage.setItem("vx_bio_cred_id", cred.credentialId);

        await fetch("/api/auth/biometrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authenticatedUser.id,
            action: "register",
            credentialId: cred.credentialId,
            publicKey: cred.publicKey,
            publicKeySpki: cred.publicKeySpki,
            alg: cred.alg,
          }),
        });
      }

      completeLogin(authenticatedUser);
    } catch (err: unknown) {
      // Even if user cancels biometric prompt, allow entering dashboard
      console.warn("Biometric enrollment skipped or failed:", err);
      completeLogin(authenticatedUser);
    } finally {
      setLoading(false);
    }
  };

  // Copy Base32 formatted secret
  const handleCopyKey = () => {
    if (!twoFactorData?.secret) return;
    navigator.clipboard.writeText(twoFactorData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const formattedSecret = React.useMemo(() => {
    if (!twoFactorData?.secret) return "";
    return twoFactorData.secret.match(/.{1,4}/g)?.join(" ") || twoFactorData.secret;
  }, [twoFactorData?.secret]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#f5f5f7] dark:bg-[#000000] relative overflow-hidden select-none transition-colors duration-200">
      {/* Floating Theme Switcher Button */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema claro / oscuro"
        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-md border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all shadow-xs active:scale-95 cursor-pointer z-50 flex items-center justify-center group"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-[#ffcc00] group-hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="h-4 w-4 text-[#6e6e73] group-hover:-rotate-12 transition-transform" />
        )}
      </button>

      {/* Ambient gradient backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-[#0071E3]/15 to-[#30D158]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-[420px] z-10 bg-white/95 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl border border-[#e8e8ed] dark:border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/numa-icon.png"
              alt="numa"
              className="h-16 w-16 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-transform hover:scale-105"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white font-display">
            numa
          </h1>
          <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-1 max-w-xs">
            Gestión Financiera Personal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] dark:text-[#FF453A] text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: BIOMETRIC LOGIN (PRIMARY FOR ENROLLED DEVICE)    */}
        {/* ======================================================== */}
        {viewMode === "biometric" && (
          <div className="space-y-6 text-center py-2 animate-in fade-in duration-200">
            {/* User Profile Badge */}
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                {bioUserAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={bioUserAvatar}
                    alt={bioUserName || "Usuario"}
                    onError={() => setBioUserAvatar("")}
                    className="h-20 w-20 rounded-full object-cover shadow-md ring-2 ring-[#0071E3]/30"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#0071E3] to-[#30D158] flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {(bioUserName || "US")
                      .trim()
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "US"}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#30D158] border-2 border-white dark:border-[#1c1c1e] flex items-center justify-center text-white">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
              </div>
              <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                {bioUserName || "Cargando perfil..."}
              </h2>
              <p className="text-xs text-[#86868b] font-mono mt-0.5">
                {bioUserHandle ? `@${bioUserHandle} • ` : ""}Dispositivo Vinculado
              </p>
            </div>

            {/* Main Biometric Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#e8e8ed] dark:border-white/[0.08] hover:border-[#0071E3]/50 hover:bg-[#0071E3]/5 transition-all active:scale-[0.98] cursor-pointer group disabled:opacity-50"
              >
                <div className="h-16 w-16 rounded-full bg-[#0071E3] group-hover:bg-[#0066cc] flex items-center justify-center text-white shadow-lg shadow-[#0071E3]/25 transition-transform group-hover:scale-105">
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Fingerprint className="h-8 w-8" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white block">
                    Acceder con Huella Dactilar
                  </span>
                  <span className="text-[11px] text-[#86868b] block">
                    Touch ID / Sensor de este teléfono
                  </span>
                </div>
              </button>
            </div>

            {/* Fallback to Password/2FA */}
            <div className="pt-2 border-t border-[#e8e8ed] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setViewMode("credentials");
                }}
                className="text-xs font-medium text-[#0071E3] hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Ingresar con usuario y contraseña</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CREDENTIALS (USERNAME / EMAIL + PASSWORD)        */}
        {/* ======================================================== */}
        {viewMode === "credentials" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {hasBiometricEnrolled && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setViewMode("biometric");
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#0071E3] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Volver a Acceso con Huella</span>
                </button>
              </div>
            )}

            {/* Tab Switcher: Iniciar Sesión vs Crear Cuenta (Próximamente) */}
            <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setAuthType("login");
                  setError(null);
                }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-xs"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthType("login");
                  setError("La creación de nuevas cuentas estará disponible próximamente.");
                }}
                className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white flex items-center justify-center gap-1.5"
              >
                <span>Crear Cuenta</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b]">
                  Próx.
                </span>
              </button>
            </div>

            {authType === "login" ? (
              <>
                {/* Google Upcoming Notice Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => setError("El acceso institucional con Google estará disponible próximamente.")}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-white dark:bg-[#252528] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] text-xs font-medium text-[#1d1d1f] dark:text-white transition-all active:scale-[0.98] shadow-2xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <GoogleIcon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">Continuar con Google</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b]">
                      Próx.
                    </span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center my-3">
                  <div className="flex-grow border-t border-[#e8e8ed] dark:border-white/[0.08]" />
                  <span className="shrink-0 px-3 text-[11px] text-[#86868b] font-medium">
                    o con credenciales
                  </span>
                  <div className="flex-grow border-t border-[#e8e8ed] dark:border-white/[0.08]" />
                </div>

                {/* Credentials Form */}
                <form onSubmit={handleCredentialsSubmit} className="space-y-3.5" autoComplete="off">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                      Usuario o Correo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Usuario o correo electrónico"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                        required
                      />
                      <Mail className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={openForgotPasswordModal}
                        className="text-[11px] text-[#0071e3] hover:underline cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Introduce tu contraseña"
                        autoComplete="current-password"
                        className="w-full px-3.5 py-2.5 pl-9 pr-10 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                        required
                      />
                      <Lock className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="default"
                      disabled={loading}
                      className="w-full py-2.5 text-xs sm:text-sm rounded-xl bg-[#0071E3] hover:bg-[#0066cc] text-white active:scale-[0.98] transition-all font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Continuar a Verificación</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5" autoComplete="off">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Tu nombre (ej. Carlos Pérez)"
                      autoCapitalize="words"
                      spellCheck={false}
                      className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                      required
                    />
                    <User className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                    Usuario o Correo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regIdentifier}
                      onChange={(e) => setRegIdentifier(e.target.value)}
                      placeholder="ej. amigo o amigo@email.com"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                      required
                    />
                    <Mail className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 pl-9 pr-10 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                      required
                    />
                    <Lock className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 pl-9 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                      required
                    />
                    <Lock className="h-4 w-4 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="default"
                    disabled={loading}
                    className="w-full py-2.5 text-xs sm:text-sm rounded-xl bg-[#0071E3] hover:bg-[#0066cc] text-white active:scale-[0.98] transition-all font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Crear Cuenta e Ingresar</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: 2FA TOTP VERIFICATION (RFC 6238)                 */}
        {/* ======================================================== */}
        {viewMode === "2fa" && twoFactorData && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header info */}
            <div className="flex items-center pb-2 border-b border-[#e8e8ed] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setViewMode("credentials");
                  setError(null);
                }}
                className="flex items-center gap-1.5 text-xs text-[#0071E3] hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {!twoFactorData.enrolled ? (
              /* Enrolamiento Inicial con QR */
              <div className="space-y-3.5 text-center">
                <div className="space-y-1 text-left">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-[#0071E3]" />
                    <span>Vincula tu Google Authenticator</span>
                  </h3>
                  <p className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                    Escanea el código QR o copia la clave manual en tu app Authenticator:
                  </p>
                </div>

                <div className="flex justify-center p-3 bg-white dark:bg-white/[0.04] rounded-2xl border border-[#e8e8ed] dark:border-white/[0.08] shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${encodeURIComponent(
                      twoFactorData.qrUri || ""
                    )}`}
                    alt="Código QR 2FA"
                    className="h-36 w-36 rounded-xl object-contain bg-white p-1"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <span className="text-[11px] font-medium text-[#6e6e73] dark:text-[#86868b]">
                    Clave de configuración manual:
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#e8e8ed] dark:border-white/[0.08]">
                    <code className="text-xs font-mono font-semibold text-[#0071E3] tracking-wider select-all">
                      {formattedSecret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white dark:bg-[#2c2c2e] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white hover:bg-black/[0.02] shadow-2xs"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="h-3 w-3 text-[#30D158]" />
                          <span className="text-[#30D158]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-[#86868b]" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Verificación Normal 2FA */
              <div className="space-y-2 text-center py-2">
                <div className="h-12 w-12 rounded-2xl bg-[#0071E3]/10 border border-[#0071E3]/20 flex items-center justify-center mx-auto text-[#0071E3]">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                  Código de Autenticación en Dos Pasos
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-[#86868b] max-w-xs mx-auto">
                  Abre tu app Google Authenticator e ingresa el código temporal de 6 dígitos.
                </p>
              </div>
            )}

            {/* 6-Digit Code Input Form */}
            <form onSubmit={handle2FASubmit} className="space-y-3.5" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] text-center block">
                  Código de 6 dígitos
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    pattern="[0-9]*"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full py-3 text-center text-xl font-mono font-bold tracking-[0.4em] rounded-xl border border-[#e8e8ed] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="default"
                disabled={loading || totpCode.trim().length !== 6}
                className="w-full py-2.5 text-xs sm:text-sm rounded-xl bg-[#0071E3] hover:bg-[#0066cc] text-white active:scale-[0.98] transition-all font-semibold flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{twoFactorData.enrolled ? "Verificar y Entrar" : "Vincular y Entrar"}</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: PROMPT POST-LOGIN TO ENROLL BIOMETRICS           */}
        {/* ======================================================== */}
        {viewMode === "enroll_biometric" && (
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-200">
            <div className="h-16 w-16 rounded-full bg-[#0071E3]/10 border border-[#0071E3]/20 flex items-center justify-center mx-auto text-[#0071E3]">
              <Fingerprint className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                ¿Activar Huella en este teléfono?
              </h2>
              <p className="text-xs text-[#6e6e73] dark:text-[#86868b] max-w-xs mx-auto">
                Podrás entrar a numa en 1 segundo usando el sensor de tu dispositivo sin tener que escribir tu contraseña cada vez.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                type="button"
                onClick={handleEnrollBiometrics}
                disabled={loading}
                variant="primary"
                size="default"
                className="w-full py-2.5 text-xs sm:text-sm rounded-xl bg-[#0071E3] hover:bg-[#0066cc] text-white font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Vincular Huella Ahora</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => completeLogin(authenticatedUser)}
                className="w-full py-2 text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
              >
                Ahora no, ir al Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-[#e8e8ed] dark:border-white/[0.06] flex items-center justify-center text-center text-[11px] text-[#86868b]">
          <span>Desarrollado por Jacinto Santo • V-Rax Company</span>
        </div>
      </div>
    </div>
  );
}
