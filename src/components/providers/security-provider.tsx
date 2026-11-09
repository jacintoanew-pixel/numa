"use client";

import * as React from "react";
import { UserSession, TwoFactorState, DeviceSession } from "@/lib/security/types";
import { generateEphemeralToken } from "@/lib/security/crypto";
import { AuthModal } from "@/components/auth/auth-modal";
import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { registerFingerprintCredential } from "@/lib/auth/webauthn";

interface SecurityContextType {
  isLoggedIn: boolean;
  isAuthLoaded: boolean;
  session: UserSession;
  login: (user?: UserSession) => void;
  logout: () => void;
  updateUserName: (newName: string) => Promise<boolean>;
  updateUsername: (newUsername: string, totpCode: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string) => Promise<boolean>;
  // Biometric Bank Lock (Fingerprint only)
  isLocked: boolean;
  biometricEnabled: boolean;
  toggleBiometric: (enabled?: boolean) => Promise<boolean>;
  lockApp: () => void;
  unlockApp: () => void;
  // Auth Modals
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  openForgotPasswordModal: () => void;
  closeForgotPasswordModal: () => void;
  // 2FA state (server-managed via /api/auth/2fa)
  twoFactor: TwoFactorState;
  // Telegram Ephemeral OTP
  telegramOtp: { token: string; expiresAt: number };
  refreshTelegramOtp: () => void;
  // Active Sessions
  activeDevices: DeviceSession[];
  terminateOtherSessions: () => Promise<void>;
}

const DEFAULT_USER: UserSession = {
  id: "usr_master_01",
  name: "Admin User",
  email: "",
  username: "admin",
  avatarUrl: "",
  provider: "local",
  isVerified: true,
  linkedAt: "2026-01-15T08:00:00Z",
  role: "owner",
};

const LOGGED_OUT_USER: UserSession = {
  id: "usr_guest",
  name: "Sesión Cerrada",
  email: "",
  provider: "local",
  isVerified: false,
  linkedAt: "",
  role: "viewer",
};

function sanitizeUserSession(raw: UserSession): UserSession {
  const cleanEmail =
    raw.email &&
    !raw.email.endsWith("@numa.local") &&
    !raw.email.endsWith("@example.com")
      ? raw.email
      : "";

  const cleanUsername =
    raw.username ||
    (raw.id === "usr_demo_user"
      ? "demouser"
      : raw.id === "usr_master_01"
      ? "admin"
      : raw.name
      ? raw.name.toLowerCase().replace(/\s+/g, "")
      : "usuario");

  return {
    ...raw,
    email: cleanEmail,
    username: cleanUsername,
  };
}

const DEFAULT_2FA_STATE: TwoFactorState = {
  isEnabled: false,
  backupCodes: [],
  requireForSensitiveActions: false,
};

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes bank standard

const SecurityContext = React.createContext<SecurityContextType | null>(null);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isAuthLoaded, setIsAuthLoaded] = React.useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false);
  const [session, setSession] = React.useState<UserSession>(LOGGED_OUT_USER);
  const [biometricEnabled, setBiometricEnabled] = React.useState<boolean>(false);
  const [isLocked, setIsLocked] = React.useState<boolean>(false);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authModalTab, setAuthModalTab] = React.useState<"login" | "register">("login");
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = React.useState(false);

  const [twoFactor] = React.useState<TwoFactorState>(DEFAULT_2FA_STATE);
  const [telegramOtp, setTelegramOtp] = React.useState(generateEphemeralToken());
  const [activeDevices, setActiveDevices] = React.useState<DeviceSession[]>([]);

  // Load saved state from localStorage and server
  React.useEffect(() => {
    try {
      const isOnLoginRoute =
        typeof window !== "undefined" && window.location.pathname.startsWith("/login");
      const savedAuth = localStorage.getItem("vx_is_logged_in");

      // If browser rendered /login, middleware confirmed there is NO valid vx_auth_token cookie.
      // Clear stale vx_is_logged_in flag so AppShell/Router Cache never loop on /login.
      if (isOnLoginRoute) {
        localStorage.setItem("vx_is_logged_in", "false");
        setIsLoggedIn(false);
        setSession(LOGGED_OUT_USER);
      } else if (savedAuth === "true") {
        setIsLoggedIn(true);
        const savedUser = localStorage.getItem("vx_user_session");
        if (savedUser) {
          try {
            const parsed = sanitizeUserSession(JSON.parse(savedUser));
            setSession(parsed);
            localStorage.setItem("vx_user_session", JSON.stringify(parsed));
          } catch {
            setSession(DEFAULT_USER);
          }
        } else {
          setSession(DEFAULT_USER);
        }
      } else {
        setIsLoggedIn(false);
        setSession(LOGGED_OUT_USER);
      }

      const savedBio =
        localStorage.getItem("numa_bio_enrolled") === "true" ||
        localStorage.getItem("vx_bio_enabled") === "true";
      if (savedBio) {
        setBiometricEnabled(true);
      }
    } catch (e) {
      console.warn("Could not load security state:", e);
    } finally {
      setIsAuthLoaded(true);
    }
  }, []);

  // Inactivity Timer: Closes session automatically after inactivity
  React.useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    // Visibility change check: if user leaves tab and returns after 5 min
    let hiddenTimestamp = 0;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimestamp = Date.now();
      } else {
        if (hiddenTimestamp > 0 && Date.now() - hiddenTimestamp > INACTIVITY_TIMEOUT_MS) {
          logout();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn]);

  const login = (customUser?: UserSession) => {
    const user = sanitizeUserSession(customUser || DEFAULT_USER);
    setIsLoggedIn(true);
    setSession(user);
    setIsLocked(false);
    try {
      localStorage.setItem("vx_is_logged_in", "true");
      localStorage.setItem("vx_user_session", JSON.stringify(user));
      if (typeof window !== "undefined") {
        sessionStorage.setItem("numa_splashed", "true");
      }
    } catch {}
  };

  const logout = () => {
    setIsLoggedIn(false);
    setSession(LOGGED_OUT_USER);
    setIsLocked(false);
    try {
      localStorage.setItem("vx_is_logged_in", "false");
      localStorage.removeItem("vx_user_session");
      if (typeof document !== "undefined") {
        document.cookie = "vx_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    } catch {}

    // Call server to destroy HTTP-Only cookie and revoke session
    fetch("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        if (typeof window !== "undefined") {
          window.location.replace("/login?logout=true");
        }
      });
  };

  const updateUserName = async (newName: string): Promise<boolean> => {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    setSession((prev) => {
      const updated = { ...prev, name: trimmed };
      try {
        localStorage.setItem("vx_user_session", JSON.stringify(updated));
        if (localStorage.getItem("numa_bio_enrolled") === "true") {
          localStorage.setItem("numa_bio_user_name", trimmed);
        }
      } catch {}
      return updated;
    });

    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.id, name: trimmed }),
      });
      return true;
    } catch {
      return true;
    }
  };

  const updateUsername = async (
    newUsername: string,
    totpCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Error al actualizar nombre de usuario." };
      }
      setSession((prev) => {
        const updatedUsername = data.user?.username || newUsername.toLowerCase();
        const updated = { ...prev, username: updatedUsername };
        try {
          localStorage.setItem("vx_user_session", JSON.stringify(updated));
          if (localStorage.getItem("numa_bio_enrolled") === "true") {
            localStorage.setItem("numa_bio_user_handle", updatedUsername);
          }
        } catch {}
        return updated;
      });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Error al actualizar usuario." };
    }
  };

  const updateAvatar = async (avatarUrl: string): Promise<boolean> => {
    setSession((prev) => {
      const updated = { ...prev, avatarUrl };
      try {
        localStorage.setItem("vx_user_session", JSON.stringify(updated));
        if (localStorage.getItem("numa_bio_enrolled") === "true") {
          localStorage.setItem("numa_bio_user_avatar", avatarUrl || "");
        }
      } catch {}
      return updated;
    });

    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.id, avatarUrl }),
      });
      return true;
    } catch {
      return true;
    }
  };

  const lockApp = () => {
    logout();
  };

  const unlockApp = () => {
    setIsLocked(false);
  };

  const toggleBiometric = async (targetState?: boolean): Promise<boolean> => {
    const nextState = targetState !== undefined ? targetState : !biometricEnabled;

    if (nextState) {
      // Must successfully verify / register fingerprint on the device hardware
      const cred = await registerFingerprintCredential(session.id, session.name);
      if (!cred) {
        throw new Error("No se pudo registrar la huella dactilar. Verificación no completada.");
      }
      const handle =
        session.username ||
        (session.id === "usr_master_01"
          ? "admin"
          : session.id === "usr_demo_user"
          ? "demouser"
          : session.name.toLowerCase().replace(/\s+/g, ""));
      try {
        localStorage.setItem("numa_bio_enrolled", "true");
        localStorage.setItem("numa_bio_cred_id", cred.credentialId);
        localStorage.setItem("numa_bio_user_name", session.name || "Usuario");
        localStorage.setItem("numa_bio_user_handle", handle);
        localStorage.setItem("numa_bio_user_avatar", session.avatarUrl || "");
        localStorage.setItem("vx_bio_enabled", "true");
        localStorage.setItem("vx_bio_cred_id", cred.credentialId);
      } catch {}
      setBiometricEnabled(true);
      try {
        await fetch("/api/auth/biometrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.id,
            action: "register",
            credentialId: cred.credentialId,
            publicKey: cred.publicKey,
            publicKeySpki: cred.publicKeySpki,
            alg: cred.alg,
          }),
        });
      } catch (e) {
        console.warn("Could not persist biometric registration to server:", e);
      }
      return true;
    } else {
      setBiometricEnabled(false);
      try {
        localStorage.setItem("numa_bio_enrolled", "false");
        localStorage.removeItem("numa_bio_cred_id");
        localStorage.removeItem("numa_bio_user_name");
        localStorage.removeItem("numa_bio_user_handle");
        localStorage.removeItem("numa_bio_user_avatar");
        localStorage.setItem("vx_bio_enabled", "false");
        localStorage.removeItem("vx_bio_cred_id");
        await fetch("/api/auth/biometrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.id,
            action: "toggle",
            enabled: false,
          }),
        });
      } catch (e) {
        console.warn("Could not sync biometric disable to server:", e);
      }
      return false;
    }
  };

  const openAuthModal = (tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const openForgotPasswordModal = () => {
    setForgotPasswordModalOpen(true);
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordModalOpen(false);
  };

  const refreshTelegramOtp = () => {
    setTelegramOtp(generateEphemeralToken());
  };

  const terminateOtherSessions = async () => {
    try {
      await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_other_sessions" }),
      });
    } catch {}
    setActiveDevices((prev) => prev.filter((d) => d.isCurrent));
  };

  return (
    <SecurityContext.Provider
      value={{
        isLoggedIn,
        isAuthLoaded,
        session,
        login,
        logout,
        updateUserName,
        updateUsername,
        updateAvatar,
        isLocked,
        biometricEnabled,
        toggleBiometric,
        lockApp,
        unlockApp,
        openAuthModal,
        closeAuthModal,
        openForgotPasswordModal,
        closeForgotPasswordModal,
        twoFactor,
        telegramOtp,
        refreshTelegramOtp,
        activeDevices,
        terminateOtherSessions,
      }}
    >
      {children}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
        onSuccess={(newUser) => {
          login({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            avatarUrl: newUser.avatarUrl,
            provider: newUser.provider || "google",
            isVerified: newUser.isVerified ?? true,
            linkedAt: new Date().toISOString(),
            role: "owner",
          });
        }}
        onOpenForgotPassword={openForgotPasswordModal}
      />

      {/* Global Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordModalOpen}
        onClose={closeForgotPasswordModal}
        onSuccess={() => {
          openAuthModal("login");
        }}
      />
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = React.useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
}
