"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerAccessory?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
  bodyClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  headerAccessory,
  children,
  footer,
  maxWidth = "md",
  className,
  bodyClassName,
}: ModalProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  useBodyScrollLock(isOpen);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[maxWidth];

  const modalNode = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/60 dark:bg-black/75 backdrop-blur-md px-3 py-4 sm:p-6 flex justify-center items-start sm:items-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{ maxHeight: "calc(100dvh - 1.5rem)" }}
        className={cn(
          "relative w-full my-2 sm:my-auto flex flex-col bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.1] shadow-2xl rounded-[22px] overflow-hidden text-[#1d1d1f] dark:text-[#f5f5f7] transition-all",
          maxWidthClasses,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description || headerAccessory) && (
          <div className="shrink-0 p-5 sm:p-6 pb-3 sm:pb-3.5 border-b border-[#e8e8ed] dark:border-white/[0.08] flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerAccessory}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className="h-8 w-8 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6",
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 p-4 sm:p-5 border-t border-[#e8e8ed] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
