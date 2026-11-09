"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [navigating, setNavigating] = React.useState(false);

  // When pathname changes, finish the navigation bar animation
  React.useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  // Global listener for internal navigation clicks to trigger instant 0ms feedback
  React.useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.hasAttribute("download") &&
        target.target !== "_blank"
      ) {
        const nextUrl = new URL(target.href);
        if (nextUrl.pathname !== window.location.pathname) {
          setNavigating(true);
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, []);

  if (!navigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2.5px] bg-transparent pointer-events-none">
      <div className="h-full bg-gradient-to-r from-[#0071e3] via-[#2997ff] to-[#0071e3] animate-pulse w-full shadow-[0_0_8px_#0071e3]" />
    </div>
  );
}
