"use client";

import * as React from "react";
import { Download, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    // Detect if already installed / standalone
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://"))
    ) {
      setIsInstalled(true);
    }

    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));

      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    }

    const handler = (e: any) => {
      e?.preventDefault?.();
      setDeferredPrompt((window as any).deferredPwaPrompt || e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("pwa-prompt-available", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        (window as any).deferredPwaPrompt = null;
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-prompt-available", handler);
    };
  }, []);

  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateMessage, setUpdateMessage] = React.useState<string | null>(null);

  const handleForceUpdate = async () => {
    try {
      setIsUpdating(true);
      setUpdateMessage("Sincronizando con el servidor...");

      // 1. Force update Service Worker if available
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }

      // 2. Clear stale cache storage
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      setUpdateMessage("Actualización completada. Recargando...");
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err: any) {
      console.warn("Error forcing PWA update:", err);
      window.location.reload();
    }
  };

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (typeof window !== "undefined" ? (window as any).deferredPwaPrompt : null);
    if (prompt) {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        (window as any).deferredPwaPrompt = null;
      }
    }
  };

  if (isInstalled) {
    return (
      <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-[#e8e8ed] dark:border-white/[0.08] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-[#1D8348] dark:text-[#30D158] flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-[#1d1d1f] dark:text-[#f5f5f7]">
                Aplicación Instalada en este Dispositivo
              </h4>
              <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                Versión sincronizada directamente con el servidor.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            PWA Activa
          </span>
        </div>

        <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b] leading-relaxed bg-[#f5f5f7] dark:bg-black/20 p-2.5 rounded-lg border border-[#e8e8ed] dark:border-white/5">
          <strong>No necesitas borrar ni reinstalar la aplicación.</strong> Las mejoras y correcciones se descargan automáticamente cada vez que abres la app. Si deseas forzar la última versión de inmediato, pulsa el botón a continuación.
        </p>

        <div className="pt-1 flex items-center gap-3">
          <Button
            type="button"
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="w-full text-xs font-semibold py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
          >
            <Smartphone className={`h-3.5 w-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            <span>{isUpdating ? (updateMessage || "Actualizando...") : "Actualizar y Recargar Ahora"}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.08] space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex items-center justify-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/numa-icon.png" alt="numa" className="h-9 w-9 object-contain drop-shadow-sm" />
        </div>
        <div>
          <h4 className="font-semibold text-xs text-[#1d1d1f] dark:text-[#f5f5f7]">
            Instalar numa en tu teléfono
          </h4>
          <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b] leading-tight mt-0.5">
            Disfruta de experiencia de pantalla completa, apertura instantánea y sin marcos de navegador.
          </p>
        </div>
      </div>

      {deferredPrompt ? (
        <Button
          type="button"
          onClick={handleInstallClick}
          className="w-full text-xs font-semibold py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white flex items-center justify-center gap-2 rounded-lg cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instalar App en este Dispositivo</span>
        </Button>
      ) : isIOS ? (
        <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] bg-white dark:bg-black/20 p-2.5 rounded-lg border border-[#e8e8ed] dark:border-white/5 space-y-1">
          <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Cómo instalar en iOS (Safari):</p>
          <p>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha) y selecciona <strong>&quot;Agregar a la pantalla de inicio&quot;</strong>.</p>
        </div>
      ) : (
        <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] bg-white dark:bg-black/20 p-2.5 rounded-lg border border-[#e8e8ed] dark:border-white/5 space-y-1">
          <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Instalación en Android (Brave / Chrome):</p>
          <p>Toca los tres puntos (⋮) de tu navegador y selecciona <strong>&quot;Instalar aplicación&quot;</strong>.</p>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleForceUpdate}
          disabled={isUpdating}
          className="w-full text-center text-[11px] text-[#6e6e73] hover:text-[#0071e3] dark:text-[#86868b] dark:hover:text-[#0071e3] cursor-pointer py-1"
        >
          {isUpdating ? "Sincronizando..." : "Comprobar y forzar recarga limpia del servidor"}
        </button>
      </div>
    </div>
  );
}

/**
 * Clean, prominent installation prompt for the Login screen
 * Allows users to install the app BEFORE or WITHOUT needing to log in.
 */
export function LoginInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsInstalled(isStandalone);

      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));

      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    }

    const onPrompt = (e: any) => {
      e?.preventDefault?.();
      setDeferredPrompt((window as any).deferredPwaPrompt || e);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pwa-prompt-available", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pwa-prompt-available", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!isMounted || isInstalled) return null;

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (typeof window !== "undefined" ? (window as any).deferredPwaPrompt : null);
    if (prompt) {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        (window as any).deferredPwaPrompt = null;
      }
    }
  };

  return (
    <div className="mt-4 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#e8e8ed] dark:border-white/[0.08] text-left transition-all space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#0e1112] border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/numa-icon.png" alt="numa" className="h-full w-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-xs text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
            Instalar numa en tu pantalla de inicio
          </h4>
          <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b] leading-tight">
            No necesitas iniciar sesión para instalarla.
          </p>
        </div>
      </div>

      {deferredPrompt ? (
        <Button
          type="button"
          onClick={handleInstallClick}
          className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instalar numa en este Teléfono</span>
        </Button>
      ) : isIOS ? (
        <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] bg-white/60 dark:bg-black/30 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-1">
          <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Cómo instalar en iOS (iPhone):</p>
          <p>
            Toca el botón <strong>Compartir</strong> en Safari y pulsa <strong>&quot;Agregar al inicio&quot;</strong>.
          </p>
        </div>
      ) : (
        <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] bg-white/60 dark:bg-black/30 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-1">
          <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">En Android (Brave / Chrome):</p>
          <p>
            Toca los tres puntos (<strong>⋮</strong>) del navegador y selecciona{" "}
            <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
