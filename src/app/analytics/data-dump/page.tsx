"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, FileJson, FileSpreadsheet, RefreshCcw, ClipboardList, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/Button";
import { useTokens } from "@/context/TokenContext";
import { usePayments } from "@/hooks/usePayments";
import { useOperations } from "@/context/OperationsContext";
import { loadConfig } from "@/lib/config";
import { dashboardFollowUpKey } from "@/lib/dashboard-data";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function convertToCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const string = String(value).replace(/"/g, '""');
          return string.includes(",") ? `"${string}"` : string;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

async function fetchConfigSnapshot() {
  try {
    return await loadConfig();
  } catch (error) {
    console.warn("Failed to load config snapshot, falling back to defaults.", error);
    return loadConfig("/config.json");
  }
}

function DataDumpContent() {
  const [configSnapshot, setConfigSnapshot] = useState<Record<string, unknown> | null>(null);
  const tokenState = useTokens();
  const { invoices, requests } = usePayments();
  const { followUps, tickets } = useOperations();
  const tokenImportInput = useRef<HTMLInputElement | null>(null);
  const paymentsImportInput = useRef<HTMLInputElement | null>(null);
  const reviewsImportInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchConfigSnapshot().then((data) => {
      if (mounted) {
        setConfigSnapshot(data ?? {});
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const configExport = useMemo(() => {
    if (!configSnapshot) return null;
    const { branding, routes, analytics } = configSnapshot as Record<string, unknown>;
    return { branding, routes, analytics };
  }, [configSnapshot]);

  const tokensExport = useMemo(
    () => ({
      baseAllowance: tokenState.baseAllowance,
      usedTokens: tokenState.usedTokens,
      remainingTokens: tokenState.remainingTokens,
      addOns: tokenState.totalAddOnTokens,
      rollover: tokenState.rolloverTokens,
      purchases: tokenState.purchases,
    }),
    [tokenState]
  );

  const paymentsExport = useMemo(
    () => ({
      invoices,
      paymentRequests: requests,
    }),
    [invoices, requests]
  );

  const reviewsExport = useMemo(
    () => ({
      followUps,
      tickets,
    }),
    [followUps, tickets]
  );

  const downloadJSON = (filename: string, data: unknown) => {
    downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
  };

  const downloadCSV = (filename: string, rows: Record<string, unknown>[]) => {
    const csv = convertToCSV(rows);
    if (!csv) {
      alert("No rows available to export.");
      return;
    }
    downloadFile(filename, csv, "text/csv");
  };

  const handleTokensImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextState = {
        usedTokens: Number(parsed.usedTokens ?? 0),
        purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
        rolloverTokens: Number(parsed.rollover ?? 0),
        lastResetPeriod: typeof parsed.lastResetPeriod === "string" ? parsed.lastResetPeriod : new Date().toISOString().slice(0, 7),
        killswitchEnabled: Boolean(parsed.killswitchEnabled ?? false),
        notifiedAtCap: Boolean(parsed.notifiedAtCap ?? false),
        autoTopUpNotice: parsed.autoTopUpNotice ?? null,
      };
      window.localStorage.setItem("revive-token-purchases", JSON.stringify(nextState));
      try {
        await fetch("/api/data-dump/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "tokens", payload: { ...parsed, ...nextState } }),
        });
      } catch (err) {
        console.warn("Failed to persist token import to server", err);
      }
      alert("Token data imported. Reloading to apply the new dataset.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to import token data", error);
      alert("Unable to import token data. Please ensure the JSON matches the exported format.");
    } finally {
      event.target.value = "";
    }
  };

  const handlePaymentsImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextState = {
        localInvoices: Array.isArray(parsed.localInvoices ?? parsed.invoices) ? parsed.localInvoices ?? parsed.invoices : [],
        requests: Array.isArray(parsed.requests ?? parsed.paymentRequests) ? parsed.requests ?? parsed.paymentRequests : [],
      };
      window.localStorage.setItem("revive-payments-local", JSON.stringify(nextState));
      try {
        await fetch("/api/data-dump/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "payments", payload: { invoices: nextState.localInvoices, requests: nextState.requests } }),
        });
      } catch (err) {
        console.warn("Failed to persist payments import to server", err);
      }
      alert("Payments data imported. Reloading to apply.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to import payments data", error);
      alert("Unable to import payments data. Please use a JSON export generated from this dashboard.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReviewsImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.followUps)) {
        window.localStorage.setItem(dashboardFollowUpKey, JSON.stringify(parsed.followUps));
      }
      if (Array.isArray(parsed.tickets)) {
        window.localStorage.setItem("revive-operations-tickets", JSON.stringify(parsed.tickets));
      }
      try {
        await fetch("/api/data-dump/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reviews",
            payload: {
              followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
              tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
            },
          }),
        });
      } catch (err) {
        console.warn("Failed to persist review import to server", err);
      }
      alert("Review data imported. Reloading to apply.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to import review data", error);
      alert("Unable to import review data. Please provide a JSON export created from this tool.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <input ref={tokenImportInput} type="file" accept="application/json" className="hidden" onChange={handleTokensImport} />
      <input ref={paymentsImportInput} type="file" accept="application/json" className="hidden" onChange={handlePaymentsImport} />
      <input ref={reviewsImportInput} type="file" accept="application/json" className="hidden" onChange={handleReviewsImport} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Company Data Export
          </h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            Download JSON or CSV snapshots for configuration, tokens, payments, and review operations. Use these files for audits, sandbox seeding, or backups.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em]"
          onClick={() => window.location.reload()}
        >
          <RefreshCcw size={14} />
          Refresh data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/5 p-5" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Workspace configuration
              </h2>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                Branding options, navigation routes, analytics flags.
              </p>
            </div>
            <FileJson size={18} className="text-brand" />
          </header>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadJSON("config.json", configExport ?? {})}
              disabled={!configExport}
              className="inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Download size={12} />
              Download JSON
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Token ledger
              </h2>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                Allowance, add-ons, carryover, and purchase history.
              </p>
            </div>
            <FileSpreadsheet size={18} className="text-emerald-300" />
          </header>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Button variant="secondary" size="sm" onClick={() => downloadJSON("tokens.json", tokensExport)} className="inline-flex items-center gap-2">
              <FileJson size={12} />
              JSON snapshot
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadCSV(
                  "token-purchases.csv",
                  tokenState.purchases.map((purchase) => ({
                    purchaseId: purchase.purchaseId,
                    addon: purchase.addon.name,
                    tokens: purchase.addon.tokens,
                    chargeGBP: purchase.chargeGBP ?? 0,
                    autoTopUp: purchase.autoTopUp ?? false,
                    purchasedAt: purchase.purchasedAt,
                  }))
                )
              }
              className="inline-flex items-center gap-2"
            >
              <Download size={12} />
              Purchases CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => tokenImportInput.current?.click()} className="inline-flex items-center gap-2">
              <Upload size={12} />
              Import JSON
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Payments & invoices
              </h2>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                Stripe invoice data blended with local payment requests.
              </p>
            </div>
            <FileSpreadsheet size={18} className="text-sky-300" />
          </header>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Button variant="secondary" size="sm" onClick={() => downloadJSON("payments.json", paymentsExport)} className="inline-flex items-center gap-2">
              <FileJson size={12} />
              JSON bundle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadCSV(
                  "invoices.csv",
                  invoices.map((invoice) => ({
                    id: invoice.id,
                    customer: invoice.customerName,
                    amount: invoice.amount,
                    status: invoice.status,
                    dueDate: invoice.dueDate ? new Date(invoice.dueDate * 1000).toISOString() : "",
                  }))
                )
              }
              className="inline-flex items-center gap-2"
            >
              <Download size={12} />
              Invoices CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => paymentsImportInput.current?.click()} className="inline-flex items-center gap-2">
              <Upload size={12} />
              Import JSON
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Reviews & operations
              </h2>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                Current follow-up queue and the automation tickets it generated.
              </p>
            </div>
            <ClipboardList size={18} className="text-amber-300" />
          </header>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Button variant="secondary" size="sm" onClick={() => downloadJSON("reviews.json", reviewsExport)} className="inline-flex items-center gap-2">
              <FileJson size={12} />
              JSON export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadCSV(
                  "follow-ups.csv",
                  followUps.map((item) => ({
                    id: item.id,
                    contact: item.contactName,
                    status: item.status,
                    company: item.company ?? "",
                    reason: item.reason,
                    assignedTo: item.assignedTo ?? "",
                    lastTouchpoint: item.lastTouchpoint,
                  }))
                )
              }
              className="inline-flex items-center gap-2"
            >
              <Download size={12} />
              Follow-ups CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => reviewsImportInput.current?.click()} className="inline-flex items-center gap-2">
              <Upload size={12} />
              Import JSON
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DataDumpPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DataDumpContent />
      </AppShell>
    </ProtectedRoute>
  );
}

