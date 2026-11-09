"use client";

import * as React from "react";

let activeLocks = 0;
let originalBodyOverflow = "";
let originalHtmlOverflow = "";
let originalBodyOverscroll = "";

/**
 * Locks document.body and document.documentElement scrolling when a modal or sheet is active.
 * Restores original overflow and overscroll-behavior styles upon unmount or when unlocked.
 * Uses reference counting to support multiple/stacked open dialogs safely.
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  React.useEffect(() => {
    if (!isLocked || typeof document === "undefined") return;

    if (activeLocks === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalBodyOverscroll = document.body.style.overscrollBehavior;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    }
    activeLocks++;

    return () => {
      activeLocks--;
      if (activeLocks <= 0) {
        activeLocks = 0;
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
      }
    };
  }, [isLocked]);
}
