"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tokenAddons, type TokenAddon, autoTopUpPack } from "@/lib/tokens";
import { tierMeta } from "@/lib/tiers";
import { useTier } from "./TierContext";
import { ContextErrorBoundary } from "@/components/ContextBoundary";
import { useEventLog } from "./EventLogContext";
import { useAuth } from "./AuthContext";

type TokenPurchase = {
  purchaseId: string;
  addon: TokenAddon;
  purchasedAt: string;
  autoTopUp?: boolean;
  chargeGBP?: number;
};

type AutoTopUpNotice = {
  packsApplied: number;
  tokensAdded: number;
  chargeGBP: number;
  occurredAt: string;
};

type TokenContextValue = {
  baseAllowance: number;
  usedTokens: number;
  setUsedTokens: (next: number) => void;
  purchases: TokenPurchase[];
  rolloverTokens: number;
  availableAddons: TokenAddon[];
  totalAddOnTokens: number;
  totalTokens: number;
  remainingTokens: number;
  purchaseAddon: (addonId: string) => void;
  refundAddon: (purchaseId: string) => void;
  killswitchEnabled: boolean;
  toggleKillswitch: () => void;
  killswitchTriggered: boolean;
  autoTopUpNotice: AutoTopUpNotice | null;
  dismissAutoTopUpNotice: () => void;
  resetDemoState: () => void;
  storageError: string | null;
};

const TokenContext = createContext<TokenContextValue | undefined>(undefined);

// Token storage is per-tenant (business/company level)
// All users within the same tenant share the same token pool
function getStorageKey(tenantId: string | null): string {
  return `revive-tokens-${tenantId || "default"}`;
}

type TokenState = {
  usedTokens: number;
  purchases: TokenPurchase[];
  rolloverTokens: number;
  lastResetPeriod: string;
  killswitchEnabled: boolean;
  notifiedAtCap: boolean;
  autoTopUpNotice: AutoTopUpNotice | null;
};

function createDefaultState(): TokenState {
  return {
    usedTokens: 18420,
    purchases: [],
    rolloverTokens: 0,
    lastResetPeriod: new Date().toISOString().slice(0, 7),
    killswitchEnabled: false,
    notifiedAtCap: false,
    autoTopUpNotice: null,
  };
}

function loadStoredState(tenantId: string | null): { state: TokenState; error: string | null } {
  if (typeof window === "undefined") {
    return { state: createDefaultState(), error: null };
  }
  try {
    const storageKey = getStorageKey(tenantId);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { state: createDefaultState(), error: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { state: { ...createDefaultState(), purchases: parsed }, error: null };
    }
    return {
      state: {
        ...createDefaultState(),
        ...parsed,
        purchases: Array.isArray(parsed?.purchases) ? parsed.purchases : [],
        rolloverTokens: typeof parsed?.rolloverTokens === "number" ? parsed.rolloverTokens : 0,
        killswitchEnabled: Boolean(parsed?.killswitchEnabled),
        lastResetPeriod:
          typeof parsed?.lastResetPeriod === "string" ? parsed.lastResetPeriod : createDefaultState().lastResetPeriod,
        notifiedAtCap: Boolean(parsed?.notifiedAtCap),
        autoTopUpNotice: parsed?.autoTopUpNotice ?? null,
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage error";
    return { state: createDefaultState(), error: message };
  }
}

function persistState(state: TokenState, tenantId: string | null) {
  if (typeof window === "undefined") return true;
  try {
    const storageKey = getStorageKey(tenantId);
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { tier } = useTier();
  const { recordEvent } = useEventLog();
  const { user } = useAuth();
  const tenantId = user?.tenantId || null;
  const baseAllowance = tierMeta[tier]?.tokenAllowance ?? 25000;
  const initialLoad = useRef(loadStoredState(tenantId));
  const [state, setState] = useState<TokenState>(initialLoad.current.state);
  const [storageError, setStorageError] = useState<string | null>(initialLoad.current.error);
  
  // Reload state when tenant changes (user switches business)
  useEffect(() => {
    const newState = loadStoredState(tenantId);
    setState(newState.state);
    setStorageError(newState.error);
  }, [tenantId]);

  const totalAddOnTokens = useMemo(
    () => state.purchases.reduce((sum, purchase) => sum + purchase.addon.tokens, 0),
    [state.purchases]
  );

  const totalTokens = baseAllowance + totalAddOnTokens + state.rolloverTokens;
  const remainingTokens = Math.max(totalTokens - state.usedTokens, 0);
  const killswitchTriggered = state.killswitchEnabled && remainingTokens === 0;

  const currentCapacity = useMemo(
    () => baseAllowance + state.rolloverTokens + state.purchases.reduce((sum, purchase) => sum + purchase.addon.tokens, 0),
    [baseAllowance, state.rolloverTokens, state.purchases]
  );

  useEffect(() => {
    const ok = persistState(state, tenantId);
    setStorageError(ok ? null : "Unable to persist token data. Changes will revert on refresh.");
  }, [state, tenantId]);

  useEffect(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    let resetOccurred = false;
    let carryoverTokens = 0;
    setState((prev) => {
      if (prev.lastResetPeriod === currentPeriod) return prev;
      const prevTotalAddOns = prev.purchases.reduce((sum, purchase) => sum + purchase.addon.tokens, 0);
      const prevTotalTokens = baseAllowance + prevTotalAddOns + prev.rolloverTokens;
      carryoverTokens = Math.max(prevTotalTokens - prev.usedTokens, 0);
      resetOccurred = true;
      return {
        ...prev,
        usedTokens: 0,
        rolloverTokens: carryoverTokens,
        lastResetPeriod: currentPeriod,
        notifiedAtCap: false,
      };
    });
    if (resetOccurred) {
      recordEvent({
        category: "tokens",
        action: "monthly_reset",
        summary: `Token allowance reset for ${currentPeriod}`,
        severity: "info",
        meta: {
          carriedOverTokens: carryoverTokens,
          baseAllowance,
        },
      });
    }
  }, [baseAllowance, recordEvent]);

  useEffect(() => {
    if (state.usedTokens < currentCapacity) {
      if (state.notifiedAtCap) {
        setState((prev) => (prev.notifiedAtCap ? { ...prev, notifiedAtCap: false } : prev));
      }
      return;
    }

    if (state.killswitchEnabled) {
      if (!state.notifiedAtCap) {
        try {
          alert("Token limit reached. Kill switch is active, so automations are paused until you add more tokens.");
        } catch {
          /* no ui channel available */
        }
        setState((prev) => ({ ...prev, notifiedAtCap: true }));
      }
      return;
    }

    const deficit = state.usedTokens - currentCapacity;
    if (deficit < 0) return;

    const packsNeeded = Math.ceil((deficit + 1) / autoTopUpPack.tokens);
    if (packsNeeded <= 0) return;

    let alertShown = false;
    let appliedPacks = 0;
    let tokensAdded = 0;
    setState((prev) => {
      const prevCapacity = baseAllowance + prev.rolloverTokens + prev.purchases.reduce((sum, purchase) => sum + purchase.addon.tokens, 0);
      if (prev.usedTokens < prevCapacity) return prev;
      const outstanding = prev.usedTokens - prevCapacity;
      const requiredPacks = Math.ceil((outstanding + 1) / autoTopUpPack.tokens);
      if (requiredPacks <= 0) return prev;
      const timestamp = Date.now();
      const newPurchases: TokenPurchase[] = Array.from({ length: requiredPacks }).map((_, index) => ({
        purchaseId: `${autoTopUpPack.id}-${timestamp}-${index}`,
        addon: autoTopUpPack,
        purchasedAt: new Date().toISOString(),
        autoTopUp: true,
        chargeGBP: autoTopUpPack.priceGBP,
      }));
      alertShown = true;
      appliedPacks = requiredPacks;
      tokensAdded = requiredPacks * autoTopUpPack.tokens;
      return {
        ...prev,
        purchases: [...newPurchases, ...prev.purchases],
        notifiedAtCap: false,
        autoTopUpNotice: {
          packsApplied: requiredPacks,
          tokensAdded,
          chargeGBP: requiredPacks * autoTopUpPack.priceGBP,
          occurredAt: new Date().toISOString(),
        },
      };
    });

    if (alertShown) {
      try {
        alert(
          `Auto top-up applied: ${appliedPacks} × ${autoTopUpPack.tokens.toLocaleString()} tokens at £${autoTopUpPack.priceGBP} each. Tokens are now available.`
        );
      } catch {
        /* no ui channel available */
      }
    }
    if (alertShown) {
      recordEvent({
        category: "tokens",
        action: "auto_top_up",
        summary: `Auto top-up applied (${appliedPacks} × ${autoTopUpPack.tokens.toLocaleString()} tokens)`,
        severity: "warning",
        meta: {
          appliedPacks,
          tokensAdded,
          totalCharge: appliedPacks * autoTopUpPack.priceGBP,
        },
      });
    }
  }, [state.usedTokens, currentCapacity, state.killswitchEnabled, state.notifiedAtCap, baseAllowance, recordEvent]);

  const setUsedTokens = useCallback((next: number) => {
    setState((prev) => ({ ...prev, usedTokens: Math.max(next, 0) }));
  }, []);

  const purchaseAddon = useCallback((addonId: string) => {
    const addon = tokenAddons.find((item) => item.id === addonId);
    if (!addon) return;
    const timestamp = Date.now();
    const purchaseId = `${addon.id}-${timestamp}`;
    const purchasedAt = new Date(timestamp).toISOString();
    setState((prev) => ({
      ...prev,
      purchases: [
        {
          purchaseId,
          addon,
          purchasedAt,
          chargeGBP: addon.priceGBP,
        },
        ...prev.purchases,
      ],
      notifiedAtCap: false,
    }));
    recordEvent({
      category: "tokens",
      action: "purchase_addon",
      summary: `Purchased ${addon.tokens.toLocaleString()} token add-on (${addon.name})`,
      severity: "info",
      createdAt: purchasedAt,
      meta: {
        addonId: addon.id,
        priceGBP: addon.priceGBP,
        purchaseId,
      },
    });
  }, [recordEvent]);

  const refundAddon = useCallback((purchaseId: string) => {
    let removed: TokenPurchase | null = null;
    setState((prev) => {
      const found = prev.purchases.find((entry) => entry.purchaseId === purchaseId);
      removed = found ?? null;
      if (!found) return prev;
      return {
        ...prev,
        purchases: prev.purchases.filter((entry) => entry.purchaseId !== purchaseId),
      };
    });
    if (removed) {
      const removedAddon = removed as TokenPurchase;
      recordEvent({
        category: "tokens",
        action: "refund_addon",
        summary: `Removed token add-on (${removedAddon.addon.name})`,
        severity: "info",
        meta: {
          addonId: removedAddon.addon.id,
          purchaseId,
        },
      });
    }
  }, [recordEvent]);

  const toggleKillswitch = useCallback(() => {
    let enabled = false;
    setState((prev) => {
      enabled = !prev.killswitchEnabled;
      return { ...prev, killswitchEnabled: enabled };
    });
    recordEvent({
      category: "tokens",
      action: enabled ? "killswitch_enabled" : "killswitch_disabled",
      summary: enabled ? "Token kill switch enabled" : "Token kill switch disabled",
      severity: enabled ? "warning" : "info",
    });
  }, [recordEvent]);

  const dismissAutoTopUpNotice = useCallback(() => {
    setState((prev) => ({ ...prev, autoTopUpNotice: null }));
  }, []);

  const resetDemoState = useCallback(() => {
    setState(createDefaultState());
    setStorageError(null);
    if (typeof window !== "undefined") {
      try {
        const storageKey = getStorageKey(tenantId);
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    recordEvent({
      category: "tokens",
      action: "reset_demo_state",
      summary: "Token data reset to demo defaults",
      severity: "info",
    });
  }, [recordEvent, tenantId]);

  const value: TokenContextValue = {
    baseAllowance,
    usedTokens: state.usedTokens,
    setUsedTokens,
    purchases: state.purchases,
    rolloverTokens: state.rolloverTokens,
    availableAddons: tokenAddons,
    totalAddOnTokens,
    totalTokens,
    remainingTokens,
    purchaseAddon,
    refundAddon,
    killswitchEnabled: state.killswitchEnabled,
    toggleKillswitch,
    killswitchTriggered,
    autoTopUpNotice: state.autoTopUpNotice,
    dismissAutoTopUpNotice,
    resetDemoState,
    storageError,
  };

  return (
    <ContextErrorBoundary name="TokenContext" onReset={resetDemoState}>
      <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useTokens() {
  const ctx = useContext(TokenContext);
  if (!ctx) {
    throw new Error("useTokens must be used within a TokenProvider");
  }
  return ctx;
}
