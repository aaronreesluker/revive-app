"use client";

import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { ContextErrorBoundary } from "@/components/ContextBoundary";
import type { TierId } from "../lib/tiers";

type TierContextValue = {
  tier: TierId;
  setTier: (tier: TierId) => void;
  resetTierPreview?: () => void;
  storageError?: string | null;
};

const TierContext = createContext<TierContextValue | undefined>(undefined);

const STORAGE_KEY = "revive-tier-preview";

export function TierProvider({
  value: externalValue,
  children,
}: {
  value?: TierContextValue;
  children: React.ReactNode;
}) {
  const [internalTier, setInternalTier] = useState<TierId>("core");
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load tier from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "lite" || stored === "core" || stored === "growth") {
        setInternalTier(stored);
      }
    } catch {
      setStorageError("Unable to load tier preference");
    }
  }, []);

  const setTier = useCallback((tier: TierId) => {
    setInternalTier(tier);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, tier);
      } catch {
        setStorageError("Unable to save tier preference");
      }
    }
  }, []);

  const resetTierPreview = useCallback(() => {
    setInternalTier("core");
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  // Use external value if provided, otherwise use internal state
  const value = useMemo(() => {
    if (externalValue) {
      return externalValue;
    }
    return {
      tier: internalTier,
      setTier,
      resetTierPreview,
      storageError,
    };
  }, [externalValue, internalTier, setTier, resetTierPreview, storageError]);
  
  return (
    <ContextErrorBoundary name="TierContext" onReset={value.resetTierPreview}>
      <TierContext.Provider value={value}>{children}</TierContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) {
    throw new Error("useTier must be used within a TierProvider");
  }
  return ctx;
}
