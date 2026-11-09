import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { DM_Sans } from "next/font/google";
import "@/styles/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PrivacyProvider } from "@/components/theme/privacy-provider";
import { FinancialStoreProvider } from "@/components/providers/financial-store-provider";
import { SecurityProvider } from "@/components/providers/security-provider";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "numa",
  description: "numa • Admin User",
  manifest: "/manifest.json",
  applicationName: "numa",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "numa",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121214",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") || undefined;

  return (
    <html lang="es" className={`${dmSans.variable} font-sans`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="numa" />
        <meta name="application-name" content="numa" />
        <meta name="theme-color" content="#121214" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("vx-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})();
            window.deferredPwaPrompt = null;
            window.addEventListener('beforeinstallprompt', function(e) {
              window.deferredPwaPrompt = e;
              window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
            });
            window.addEventListener('appinstalled', function() {
              window.deferredPwaPrompt = null;
              window.dispatchEvent(new CustomEvent('pwa-installed-success'));
            });`,
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // Aggressive cache purge for previous builds
              if (typeof window !== 'undefined' && 'caches' in window) {
                caches.keys().then(function(keys) {
                  keys.forEach(function(key) {
                    if (key !== 'numa-pwa-v12-pure-purge') {
                      caches.delete(key);
                    }
                  });
                });
              }

              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      reg.update();

                      reg.addEventListener('updatefound', function() {
                        var newWorker = reg.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                          });
                        }
                      });
                    })
                    .catch(function(err) {
                      console.warn('[PWA] Fallo de registro SW:', err);
                    });

                  document.addEventListener('visibilitychange', function() {
                    if (document.visibilityState === 'visible') {
                      navigator.serviceWorker.getRegistration().then(function(r) {
                        if (r) r.update();
                      });
                    }
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071E3] selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <PrivacyProvider>
            <SecurityProvider>
              <FinancialStoreProvider>
                <AppShell>{children}</AppShell>
              </FinancialStoreProvider>
            </SecurityProvider>
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
