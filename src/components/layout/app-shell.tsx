"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSecurity } from "@/components/providers/security-provider";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { CommandPalette } from "@/components/layout/command-palette";
import { Header } from "@/components/layout/header";
import { BottomTabBar } from "@/components/layout/bottom-tabbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isAuthLoaded } = useSecurity();

  const isPublicPage = pathname === "/login" || pathname === "/";

  // SPA Route guarding: Clean SPA navigation, NO destructive window.location.replace
  React.useEffect(() => {
    if (!isAuthLoaded) return;

    if (!isLoggedIn && !isPublicPage) {
      router.replace("/login");
    } else if (isLoggedIn && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, isAuthLoaded, isPublicPage, pathname, router]);

  // Public / Login screen layout: Instant rendering, zero blocking overlays
  if (pathname === "/login" || (isPublicPage && !isLoggedIn)) {
    return <main className="min-h-screen flex flex-col">{children}</main>;
  }

  // Waiting for initial session resolution on protected routes
  if (!isLoggedIn) {
    return <div className="min-h-screen bg-[#121214]" />;
  }

  /* Full Authenticated App Experience: Instant rendering */
  return (
    <>
      {/* 0ms Instant Feedback Progress Indicator */}
      <NavigationProgress />

      {/* Global Spotlight / Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette />

      {/* Apple Navigation Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 pb-24 xl:pb-8 apple-animate-page">
        {children}
      </main>

      {/* Apple Minimal Frosted Footer */}
      <footer className="hidden md:block border-t border-[#e8e8ed] dark:border-white/[0.08] bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl py-5 px-4 text-center text-xs text-[#6e6e73] dark:text-[#86868B]">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <span>Desarrollado por Jacinto Santo • V-Rax Company</span>
        </div>
      </footer>

      {/* Mobile iOS Bottom Tab Bar */}
      <BottomTabBar />
    </>
  );
}
