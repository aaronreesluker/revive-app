/**
 * Hook for managing BACS Direct Debit mandates
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { BacsMandate, BacsMandateStatus, BacsSetupRequest, BacsSetupResponse } from "@/types/bacs";
import { useEventLog } from "@/context/EventLogContext";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "revive-bacs-mandates";

type StoredMandates = {
  mandates: BacsMandate[];
};

const defaultStoredMandates: StoredMandates = {
  mandates: [],
};

function loadStoredMandates(): StoredMandates {
  if (typeof window === "undefined") return defaultStoredMandates;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredMandates;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultStoredMandates;
    return {
      mandates: Array.isArray(parsed.mandates) ? parsed.mandates : [],
    };
  } catch {
    return defaultStoredMandates;
  }
}

function persistStoredMandates(mandates: StoredMandates) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mandates));
  } catch {
    // ignore storage failures
  }
}

export function useBacsMandates() {
  const { recordEvent } = useEventLog();
  const { user } = useAuth();
  const tenantId = user?.tenantId || "demo-agency";

  const storedState = loadStoredMandates();
  const [mandates, setMandates] = useState<BacsMandate[]>(storedState.mandates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist mandates to localStorage whenever they change
  useEffect(() => {
    persistStoredMandates({ mandates });
  }, [mandates]);

  const setupMandate = useCallback(
    async (request: BacsSetupRequest): Promise<BacsSetupResponse> => {
      setLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        };

        // Get Stripe Connect account ID if available
        const stripeConnectStorage = await import("@/lib/stripe-connect-storage");
        const account = stripeConnectStorage.getStripeConnectAccount(tenantId);
        if (account) {
          headers["x-stripe-account-id"] = account.accountId;
        }

        const response = await fetch("/api/payments/bacs/setup", {
          method: "POST",
          headers,
          body: JSON.stringify(request),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to setup BACS mandate");
        }

        const setupResponse: BacsSetupResponse = data;

        // Create local mandate record
        const newMandate: BacsMandate = {
          id: setupResponse.mandateId,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          accountHolderName: request.accountHolderName,
          sortCode: request.sortCode,
          accountNumber: request.accountNumber,
          reference: setupResponse.mandateReference,
          status: setupResponse.status,
          stripeMandateId: data.stripeMandateId,
          stripeCustomerId: data.stripeCustomerId,
          stripePaymentMethodId: data.stripePaymentMethodId,
          createdAt: Date.now(),
          createdBy: user?.id,
        };

        setMandates((prev) => [...prev, newMandate]);

        recordEvent({
          category: "payments",
          action: "bacs_mandate_setup",
          summary: `BACS mandate setup initiated for ${request.customerName}`,
          meta: {
            mandateId: setupResponse.mandateId,
            customerEmail: request.customerEmail,
          },
        });

        return setupResponse;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to setup BACS mandate";
        setError(message);
        recordEvent({
          category: "payments",
          action: "bacs_mandate_setup_failed",
          summary: `BACS mandate setup failed: ${message}`,
          meta: {
            customerEmail: request.customerEmail,
          },
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user?.id, recordEvent]
  );

  const updateMandateStatus = useCallback(
    (mandateId: string, status: BacsMandateStatus) => {
      setMandates((prev) =>
        prev.map((m) => {
          if (m.id === mandateId) {
            return {
              ...m,
              status,
              activatedAt: status === "active" ? Date.now() : m.activatedAt,
              cancelledAt: status === "cancelled" ? Date.now() : m.cancelledAt,
            };
          }
          return m;
        })
      );
    },
    []
  );

  const cancelMandate = useCallback(
    async (mandateId: string) => {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        };

        const stripeConnectStorage = await import("@/lib/stripe-connect-storage");
        const account = stripeConnectStorage.getStripeConnectAccount(tenantId);
        if (account) {
          headers["x-stripe-account-id"] = account.accountId;
        }

        const response = await fetch(`/api/payments/bacs/cancel`, {
          method: "POST",
          headers,
          body: JSON.stringify({ mandateId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.error || "Failed to cancel mandate");
        }

        updateMandateStatus(mandateId, "cancelled");

        recordEvent({
          category: "payments",
          action: "bacs_mandate_cancelled",
          summary: `BACS mandate cancelled: ${mandateId}`,
          meta: { mandateId },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cancel mandate";
        setError(message);
        throw err;
      }
    },
    [tenantId, updateMandateStatus, recordEvent]
  );

  const activeMandates = useMemo(
    () => mandates.filter((m) => m.status === "active"),
    [mandates]
  );

  const getMandateByCustomer = useCallback(
    (customerEmail: string): BacsMandate | undefined => {
      return activeMandates.find((m) => m.customerEmail.toLowerCase() === customerEmail.toLowerCase());
    },
    [activeMandates]
  );

  return {
    mandates,
    activeMandates,
    loading,
    error,
    setupMandate,
    updateMandateStatus,
    cancelMandate,
    getMandateByCustomer,
  };
}

