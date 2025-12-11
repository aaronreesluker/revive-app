/**
 * Client-side hook for managing payments
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { StripeInvoice } from "@/lib/stripe-types";
import { useEventLog } from "@/context/EventLogContext";
import { useAuth } from "@/context/AuthContext";

type PaymentsSource = "stripe" | "stripe_connect" | "fallback" | "local";

type PaymentProductLine = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
};

type PaymentRequestPayload = {
  customerName: string;
  customerEmail?: string;
  description?: string;
  paymentDate?: string;
  billingType: "one_time" | "recurring";
  billingInterval?: "weekly" | "monthly" | "quarterly" | "yearly";
  items: PaymentProductLine[];
};

type PaymentRequestRecord = {
  id: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  link: string;
  createdAt: string;
  billingType: "one_time" | "recurring";
  billingInterval?: "weekly" | "monthly" | "quarterly" | "yearly";
  fallback: boolean;
  createdBy?: string; // User ID who created this request
};

type PayoutRules = {
  threshold: number;
  schedule: string;
  autoDisburse: boolean;
  notifyAt: number;
  destinations?: {
    primary: string;
    secondary?: string;
    secondaryEnabled?: boolean;
  };
};

const STORAGE_KEY = "revive-payments-local";

type StoredState = {
  localInvoices: StripeInvoice[];
  requests: PaymentRequestRecord[];
};

const defaultStoredState: StoredState = {
  localInvoices: [],
  requests: [],
};

function loadStoredState(): StoredState {
  if (typeof window === "undefined") return defaultStoredState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredState;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultStoredState;
    return {
      localInvoices: Array.isArray(parsed.localInvoices) ? parsed.localInvoices : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    };
  } catch {
    return defaultStoredState;
  }
}

function persistStoredState(state: StoredState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

function sumLineItems(items: PaymentProductLine[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function coerceDueDate(paymentDate?: string) {
  if (!paymentDate) return null;
  const timestamp = Date.parse(paymentDate);
  if (Number.isNaN(timestamp)) return null;
  return Math.floor(timestamp / 1000);
}

// Preset products for invoice descriptions
const presetProducts = [
  { id: "prod-website-build", name: "Website Build Fee", description: "Custom website development and design", price: 0 },
  { id: "prod-seo", name: "SEO", description: "Search engine optimization services", price: 0 },
  { id: "prod-smm", name: "SMM", description: "Social media marketing and management", price: 0 },
  { id: "prod-apps", name: "Apps", description: "Mobile and web application development", price: 0 },
];

function createInvoiceFromRequest(payload: PaymentRequestPayload, amount: number, overrides?: Partial<StripeInvoice>): StripeInvoice {
  const createdAt = Date.now();
  const lineItems = payload.items.map((item) => ({
    name: item.name,
    description: item.productId ? presetProducts.find((p) => p.id === item.productId)?.description : undefined,
    quantity: item.quantity,
    amount: item.price,
  }));

  return {
    id: overrides?.id ?? `local-invoice-${createdAt}`,
    invoiceNumber: overrides?.invoiceNumber ?? `INV-${String(createdAt).slice(-6)}`,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail ?? `billing+${createdAt}@example.com`,
    amount: overrides?.amount ?? amount,
    status: overrides?.status ?? "open",
    dueDate: overrides?.dueDate ?? coerceDueDate(payload.paymentDate),
    created: overrides?.created ?? Math.floor(createdAt / 1000),
    hostedInvoiceUrl: overrides?.hostedInvoiceUrl ?? null,
    invoicePdf: overrides?.invoicePdf ?? null,
    lineItems: lineItems.length > 0 ? lineItems : undefined,
    description: payload.description,
    taxAmount: overrides?.taxAmount ?? (amount * 0.2), // 20% VAT
    createdBy: overrides?.createdBy, // Track which user created this invoice
  };
}

export function usePayments() {
  const { recordEvent } = useEventLog();
  const { user } = useAuth();
  const tenantId = user?.tenantId || "demo-agency";
  const storedState = useMemo(loadStoredState, []);
  const [remoteInvoices, setRemoteInvoices] = useState<StripeInvoice[]>([]);
  const [localInvoices, setLocalInvoices] = useState<StripeInvoice[]>(storedState.localInvoices);
  const [requests, setRequests] = useState<PaymentRequestRecord[]>(storedState.requests);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<PaymentsSource>("local");
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    persistStoredState({ localInvoices, requests });
  }, [localInvoices, requests]);

  const invoices = useMemo(() => {
    const merged = [...localInvoices, ...remoteInvoices];
    return merged.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  }, [localInvoices, remoteInvoices]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      // Get Stripe Connect account ID for this tenant
      const stripeConnectStorage = await import("@/lib/stripe-connect-storage");
      const account = stripeConnectStorage.getStripeConnectAccount(tenantId);
      
      const headers: HeadersInit = {
        "x-tenant-id": tenantId,
      };
      if (account) {
        headers["x-stripe-account-id"] = account.accountId;
      }
      
      const response = await fetch("/api/payments?limit=50", { headers });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch payments");
      }
      setRemoteInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      setSource((data.source as PaymentsSource) || "stripe");
      setError(data.source === "fallback" ? data.error ?? null : null);
      setLastFetchedAt(Date.now());
      if (data.source === "fallback") {
        recordEvent({
          category: "payments",
          action: "stripe_fallback_used",
          summary: "Stripe unavailable – using mock invoices",
          severity: "warning",
        });
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      setRemoteInvoices([]);
      setSource("local");
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      recordEvent({
        category: "payments",
        action: "payments_fetch_failed",
        summary: "Failed to load invoices",
        severity: "critical",
        meta: { message },
      });
    } finally {
      setLoading(false);
    }
  }, [recordEvent, tenantId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const createPaymentRequest = useCallback(
    async (payload: PaymentRequestPayload) => {
      const amount = sumLineItems(payload.items);
      if (amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }

      let resultLink: string | null = null;
      let resultPaymentDate: string | null = payload.paymentDate ?? null;
      let resultBillingType: "one_time" | "recurring" = payload.billingType;
      let resultBillingInterval: "weekly" | "monthly" | "quarterly" | "yearly" | null =
        payload.billingType === "recurring" ? payload.billingInterval ?? "monthly" : null;
      let fallback = false;

      try {
        // Get Stripe Connect account ID for this tenant
        const stripeConnectStorage = await import("@/lib/stripe-connect-storage");
        const account = stripeConnectStorage.getStripeConnectAccount(tenantId);
        
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        };
        if (account) {
          headers["x-stripe-account-id"] = account.accountId;
        }
        
        const response = await fetch("/api/payments/request", {
          method: "POST",
          headers,
          body: JSON.stringify({
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            description: payload.description,
            amount,
            paymentDate: payload.paymentDate,
            billingType: payload.billingType,
            billingInterval: payload.billingInterval,
            items: payload.items.map(({ name, price, quantity, productId }) => ({ name, price, quantity, productId })),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to create payment request");
        }
        resultLink = data.link ?? null;
        resultPaymentDate = data.paymentDate ?? resultPaymentDate;
        resultBillingType = data.billingType ?? resultBillingType;
        resultBillingInterval = data.billingInterval ?? resultBillingInterval;
      } catch (error) {
        console.warn("Falling back to mock payment request", error);
        fallback = true;
        resultLink =
          resultLink ??
          `https://pay.demo.rev/${encodeURIComponent(`${payload.customerName}-${Date.now()}`).toLowerCase()}`;
      }

      const invoice = createInvoiceFromRequest(payload, amount, {
        hostedInvoiceUrl: resultLink,
        dueDate: coerceDueDate(resultPaymentDate ?? undefined) ?? coerceDueDate(payload.paymentDate) ?? null,
        createdBy: user?.id, // Track which user created this invoice
      });

      setLocalInvoices((prev) => [invoice, ...prev]);

      const requestRecord: PaymentRequestRecord = {
        id: invoice.id,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        amount,
        link: resultLink ?? "",
        createdAt: new Date().toISOString(),
        billingType: resultBillingType,
        billingInterval: resultBillingInterval ?? undefined,
        fallback,
        createdBy: user?.id, // Track which user created this request
      };

      setRequests((prev) => [requestRecord, ...prev]);

      recordEvent({
        category: "payments",
        action: "payment_request_created",
        summary: `Payment request for £${Math.round(amount).toLocaleString("en-GB")} (${payload.customerName})`,
        severity: fallback ? "warning" : "info",
        meta: {
          amount,
          billingType: resultBillingType,
          billingInterval: resultBillingInterval,
          fallback,
        },
      });

      return {
        link: requestRecord.link,
        amount,
        items: payload.items,
        paymentDate: resultPaymentDate,
        billingType: resultBillingType,
        billingInterval: resultBillingInterval,
        invoice,
        fallback,
      };
    },
    [recordEvent, user?.id]
  );

  const sendInvoiceEmail = useCallback(
    async ({ invoiceId, customerEmail, subject }: { invoiceId: string; customerEmail: string; subject?: string }) => {
      try {
        const response = await fetch("/api/payments/send-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId,
            customerEmail,
            subject: subject ?? `Invoice ${invoiceId}`,
          }),
        });
        const data = await response.json();
        if (!response.ok || data?.error) {
          throw new Error(data?.error || "Failed to send invoice");
        }
        recordEvent({
          category: "payments",
          action: "invoice_sent",
          summary: `Invoice ${invoiceId} queued for delivery`,
          severity: "info",
          meta: { invoiceId, customerEmail },
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        recordEvent({
          category: "payments",
          action: "invoice_send_failed",
          summary: `Failed to deliver invoice ${invoiceId}`,
          severity: "warning",
          meta: { invoiceId, customerEmail, message },
        });
        return false;
      }
    },
    [recordEvent]
  );

  const queueCollectionsReminder = useCallback(() => {
    const outstanding = invoices.filter((invoice) => invoice.status !== "paid");
    recordEvent({
      category: "payments",
      action: "collections_reminders_queued",
      summary: `Queued reminders for ${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}`,
      severity: outstanding.length > 0 ? "info" : "warning",
      meta: {
        outstandingValue: outstanding.reduce((sum, invoice) => sum + (invoice.amount ?? 0), 0),
      },
    });
    return outstanding.length;
  }, [invoices, recordEvent]);

  const exportPayoutReport = useCallback(() => {
    if (!invoices.length) {
      recordEvent({
        category: "payments",
        action: "payments_csv_export_empty",
        summary: "No invoices to export",
        severity: "warning",
      });
      return;
    }

    const header = "Invoice,Customer,Email,Amount (GBP),Status,Created,Due\n";
    const rows = invoices
      .map((invoice) => {
        const createdDate = new Date((invoice.created ?? 0) * 1000).toISOString();
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate * 1000).toISOString() : "";
        return [
          invoice.invoiceNumber ?? invoice.id,
          `"${invoice.customerName}"`,
          invoice.customerEmail ?? "",
          (invoice.amount ?? 0).toFixed(2),
          invoice.status,
          createdDate,
          dueDate,
        ].join(",");
      })
      .join("\n");

    const csv = `${header}${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `revive-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    recordEvent({
      category: "payments",
      action: "payments_csv_exported",
      summary: "Exported payments report (CSV)",
      severity: "info",
      meta: { invoiceCount: invoices.length },
    });
  }, [invoices, recordEvent]);

  const updatePayoutRules = useCallback(
    (rules: PayoutRules) => {
      recordEvent({
        category: "payments",
        action: "payout_rules_updated",
        summary: `Updated payout rules • threshold £${Math.round(rules.threshold).toLocaleString("en-GB")} (${rules.schedule})`,
        severity: "info",
        meta: rules,
      });
    },
    [recordEvent]
  );

  const refetch = useCallback(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    invoices,
    requests,
    loading,
    error,
    source,
    lastFetchedAt,
    createPaymentRequest,
    sendInvoiceEmail,
    queueCollectionsReminder,
    exportPayoutReport,
    updatePayoutRules,
    refetch,
  };
}
