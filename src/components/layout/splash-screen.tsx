"use client";

import * as React from "react";

interface SplashScreenProps {
  status?: string;
}

export function SplashScreen({}: SplashScreenProps = {}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-between items-center text-center select-none overflow-hidden bg-[#121214] text-white font-sans p-6"
      aria-label="Cargando numa"
      role="status"
    >
      {/* Background: Frosted Apple Space Gray Canvas with subtle geometric grid & ambient depth */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Ambient mint glow */}
        <div className="w-[420px] h-[420px] rounded-full bg-[#00e599]/[0.07] blur-[120px] animate-subtle-glow" />
        <div className="absolute w-64 h-64 rounded-full bg-[#2997ff]/[0.05] blur-[80px]" />
        
        {/* Subtle geometric dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="28" id="numa-grid-dots" patternUnits="userSpaceOnUse" width="28">
              <circle cx="14" cy="14" fill="#ffffff" r="0.75" />
            </pattern>
          </defs>
          <rect fill="url(#numa-grid-dots)" height="100%" width="100%" />
        </svg>
      </div>

      {/* Top spacer for native OS status bar harmony */}
      <div className="h-12 w-full" />

      {/* Center: Brand Insignia with layered orbital ring and breathing aura */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6 my-auto">
        {/* Emblem Container with Subtle Dashed Orbital Ring */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing ambient aura */}
          <div className="absolute -inset-6 rounded-full bg-[#00e599]/15 blur-2xl animate-subtle-glow pointer-events-none" />
          
          {/* Fine orbital dashed ring */}
          <div className="absolute -inset-5 sm:-inset-6 border border-dashed border-white/[0.14] rounded-full animate-[spin_28s_linear_infinite] pointer-events-none" />

          {/* Frosted Glass Emblem Frame */}
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-[26px] bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/[0.12] p-5 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-emblem-breathe">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/numa-symbol.png"
              alt="numa"
              className="h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(0,229,153,0.35)]"
            />
          </div>
        </div>

        {/* Loading Indicator directly below logo */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <p className="text-[13px] font-medium tracking-wide text-[#e5e5ea] font-sans">
            Cargando<span className="text-[#00e599] animate-pulse">...</span>
          </p>

          <div className="w-44 h-1 bg-white/[0.08] rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-[#00e599] to-transparent rounded-full animate-shimmer shadow-[0_0_12px_#00e599]" />
          </div>
        </div>
      </div>

      {/* Bottom Credits */}
      <div className="relative z-10 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] text-center pointer-events-none flex flex-col items-center gap-1">
        <p className="text-[11px] text-[#86868b] tracking-wide font-sans font-medium">
          Hecho por Jacinto Santo <span className="text-[#00e599]/70 mx-1.5">•</span> V-Rax Company
        </p>
      </div>
    </div>
  );
}
