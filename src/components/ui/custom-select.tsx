"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  label?: string;
  modalTitle?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  label,
  modalTitle,
  placeholder = "Seleccionar...",
  className,
  triggerClassName,
  size = "md",
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  useBodyScrollLock(isOpen);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const modalContent =
    isOpen && isMounted ? (
      <div
        className="fixed inset-0 z-[110] bg-black/60 dark:bg-black/75 backdrop-blur-md p-4 flex items-center justify-center animate-in fade-in duration-150"
        onClick={() => setIsOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle || label || ariaLabel || "Seleccionar opción"}
          style={{ maxHeight: "calc(100dvh - 3rem)" }}
          className="relative w-full max-w-sm my-auto flex flex-col bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.12] rounded-[24px] shadow-2xl overflow-hidden text-[#1d1d1f] dark:text-[#f5f5f7] animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-[#e8e8ed] dark:border-white/[0.08] flex items-center justify-between gap-3">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#1d1d1f] dark:text-white truncate">
              {modalTitle || label || ariaLabel || "Seleccionar opción"}
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar selector"
              className="h-7 w-7 rounded-full flex items-center justify-center bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.14] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Options List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-1.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99]",
                    isSelected
                      ? "bg-[#0071E3]/10 dark:bg-[#0071E3]/20 border border-[#0071E3]/35 text-[#0071E3] dark:text-[#2997ff]"
                      : "bg-[#f5f5f7] dark:bg-[#1c1c1e]/90 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-transparent text-[#1d1d1f] dark:text-[#f5f5f7]"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-xs sm:text-sm truncate",
                        isSelected ? "font-bold" : "font-medium"
                      )}
                    >
                      {opt.label}
                    </div>
                    {opt.description && (
                      <div className="text-[11px] text-[#6e6e73] dark:text-[#86868b] mt-0.5 truncate">
                        {opt.description}
                      </div>
                    )}
                  </div>

                  {opt.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6] shrink-0">
                      {opt.badge}
                    </span>
                  )}

                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-[#0071E3] text-white shadow-xs"
                        : "border border-[#d2d2d7] dark:border-white/20 bg-white/50 dark:bg-white/[0.03]"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={ariaLabel || label || "Selector"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2 text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3]",
          size === "sm"
            ? "px-3 py-1.5 text-xs rounded-full border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white hover:border-[#0071e3]/40"
            : "px-3.5 py-2.5 text-xs rounded-xl border border-[#e8e8ed] dark:border-white/10 bg-[#f5f5f7] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white hover:border-[#0071e3]/40",
          triggerClassName
        )}
      >
        <span className="truncate font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[#6e6e73] dark:text-[#86868b] shrink-0 transition-transform duration-150" />
      </button>

      {isMounted && modalContent ? createPortal(modalContent, document.body) : null}
    </div>
  );
}
