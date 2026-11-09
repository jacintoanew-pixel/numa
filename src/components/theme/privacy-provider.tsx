"use client";

import * as React from "react";

interface PrivacyContextType {
  isPrivate: boolean;
  togglePrivacy: () => void;
  maskAmount: (val: string | number) => string;
}

const PrivacyContext = React.createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("vx-privacy");
      if (saved === "true") {
        setIsPrivate(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const togglePrivacy = React.useCallback(() => {
    setIsPrivate((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vx-privacy", String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  const maskAmount = React.useCallback(
    (val: string | number) => {
      if (!isPrivate) {
        return typeof val === "number" ? val.toString() : val;
      }
      return "$••••••";
    },
    [isPrivate]
  );

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy, maskAmount }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = React.useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}
