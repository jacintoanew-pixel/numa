"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft, Send } from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = React.useState<"request" | "sent" | "reset">("request");
  const [email, setEmail] = React.useState("");
  const [token, setToken] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep("request");
      setError(null);
      setSuccessMessage(null);
      setEmail("");
      setToken("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo procesar la solicitud de recuperación.");

      setStep("sent");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Error al solicitar recuperación.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo restablecer la contraseña.");

      setSuccessMessage("¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Código inválido o expirado.");
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
          <KeyRound className="h-5 w-5 text-[#0071E3] dark:text-[#2997ff]" />
          <span>Restablecer Contraseña</span>
        </div>
      }
      description={
        step === "request"
          ? "Ingresa tu correo para enviarte un enlace seguro de recuperación por correo electrónico."
          : step === "sent"
          ? "Instrucciones enviadas con éxito a tu bandeja de correo."
          : "Ingresa el código que recibiste en tu correo y define tu nueva contraseña."
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-xs text-[#D70015] dark:text-[#FF453A] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-[#30D158]/10 border border-[#30D158]/25 text-xs text-[#1D8348] dark:text-[#30D158] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="leading-snug font-medium">{successMessage}</span>
        </div>
      )}

      {step === "request" && (
        <form onSubmit={handleRequestToken} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
              Correo Electrónico Registrado
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-hidden focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full h-10 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center justify-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{loading ? "Enviando correo..." : "Enviar Enlace por Correo"}</span>
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("reset");
              }}
              className="text-[11px] text-[#0071E3] dark:text-[#2997ff] hover:underline"
            >
              ¿Ya recibiste un código en tu correo? Ingrésalo aquí
            </button>
          </div>
        </form>
      )}

      {step === "sent" && (
        <div className="space-y-5 text-center py-2">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158]">
            <Mail className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-1.5">
              Enlace Seguro Enviado
            </h4>
            <p className="text-xs text-[#6e6e73] dark:text-[#86868b] max-w-sm mx-auto leading-relaxed">
              Hemos enviado las instrucciones y el enlace de recuperación a <span className="font-semibold text-[#1d1d1f] dark:text-white">{email}</span>. Revisa tu bandeja de entrada o spam.
            </p>
            <p className="text-[11px] text-[#86868b] mt-2 font-medium">
              Por seguridad, este enlace expira en 15 minutos.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setError(null);
                setStep("reset");
              }}
              className="w-full h-10 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white"
            >
              Ingresar Código Recibido
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full h-9 rounded-xl text-xs font-medium border-[#e8e8ed] dark:border-white/[0.1]"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetPassword} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
              Código de Recuperación de tu Correo
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ingresa el código o token de tu correo"
              className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white placeholder-[#86868b]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
              Nueva Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#86868b]" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.1] text-[#1d1d1f] dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setStep("request");
              }}
              className="h-10 px-3.5 rounded-xl text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1 h-10 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white"
            >
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
