"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Download,
  LineChart,
  PieChart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { usePayments } from "@/hooks/usePayments";
import type { StripeInvoice } from "@/lib/stripe-types";
import { useEventLog } from "@/context/EventLogContext";

type TimelinePoint = {
  key: string;
  label: string;
  collected: number;
  outstanding: number;
  cumulative: number;
};

type CohortRow = {
  month: string;
  issued: number;
  paid: number;
  outstanding: number;
  collectionRate: number;
  value: number;
};

const formatCurrency = (value: number) => `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;

function buildTimeline(invoices: StripeInvoice[]): TimelinePoint[] {
  const map = new Map<string, { collected: number; outstanding: number }>();
  invoices.forEach((invoice) => {
    const created = new Date((invoice.created ?? Date.now() / 1000) * 1000);
    const key = created.toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, { collected: 0, outstanding: 0 });
    }
    const bucket = map.get(key)!;
    if (invoice.status === "paid") {
      bucket.collected += invoice.amount;
    } else {
      bucket.outstanding += invoice.amount;
    }
  });

  const keys = Array.from(map.keys()).sort();
  let cumulative = 0;
  const points = keys.map((key) => {
    const entry = map.get(key)!;
    cumulative += entry.collected;
    return {
      key,
      label: new Date(key).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      collected: entry.collected,
      outstanding: entry.outstanding,
      cumulative,
    };
  });
  return points.slice(-12);
}

function buildCohorts(invoices: StripeInvoice[]): CohortRow[] {
  const buckets = new Map<string, CohortRow>();
  invoices.forEach((invoice) => {
    const created = new Date((invoice.created ?? Date.now() / 1000) * 1000);
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const label = created.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    if (!buckets.has(key)) {
      buckets.set(key, {
        month: label,
        issued: 0,
        paid: 0,
        outstanding: 0,
        collectionRate: 0,
        value: 0,
      });
    }
    const bucket = buckets.get(key)!;
    bucket.issued += 1;
    bucket.value += invoice.amount;
    if (invoice.status === "paid") {
      bucket.paid += 1;
    } else {
      bucket.outstanding += 1;
    }
  });

  const rows = Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, bucket]) => ({
      ...bucket,
      collectionRate: bucket.issued ? Math.round((bucket.paid / bucket.issued) * 100) : 0,
    }))
    .slice(-5)
    .reverse();

  return rows;
}

function CashflowSparkline({ data }: { data: TimelinePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
        Not enough invoice history yet.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.cumulative), 0);
  const minValue = Math.min(...data.map((point) => point.cumulative), 0);
  const range = maxValue - minValue || 1;

  const coordinates = data.map((point, index) => {
    const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
    const normalised = (point.cumulative - minValue) / range;
    const y = 100 - normalised * 90 - 5;
    return `${x},${y}`;
  });

  const outline = `0,100 ${coordinates.join(" ")} 100,100`;

  return (
    <svg viewBox="0 0 100 100" className="h-44 w-full">
      <defs>
        <linearGradient id="cashflowGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={outline} fill="url(#cashflowGradient)" stroke="none" />
      <polyline points={coordinates.join(" ")} fill="none" stroke="var(--brand)" strokeWidth={1.5} strokeLinecap="round" />
      {coordinates.map((point, index) => (
        <circle key={point} cx={point.split(",")[0]} cy={point.split(",")[1]} r="0.9" fill="var(--brand)" opacity={index === data.length - 1 ? 1 : 0.6} />
      ))}
    </svg>
  );
}

function PaymentsAnalyticsContent() {
  const router = useRouter();
  const { events } = useEventLog();
  const {
    invoices,
    requests,
    loading,
    exportPayoutReport,
    queueCollectionsReminder,
    source,
  } = usePayments();

  const timeline = useMemo(() => buildTimeline(invoices), [invoices]);
  const cohorts = useMemo(() => buildCohorts(invoices), [invoices]);
  const outstandingValue = useMemo(
    () => invoices.filter((inv) => inv.status !== "paid").reduce((sum, inv) => sum + inv.amount, 0),
    [invoices]
  );
  const paidValue = useMemo(
    () => invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0),
    [invoices]
  );
  const recurringRequests = useMemo(
    () => requests.filter((req) => req.billingType === "recurring"),
    [requests]
  );

  const paymentEvents = useMemo(
    () => events.filter((entry) => entry.category === "payments").slice(0, 6),
    [events]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/payments")} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
          <ArrowLeft size={14} />
          Back to payments
        </Button>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <Calendar size={12} />
          Refreshed {loading ? "just now" : "moments ago"}
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
          Payment Intelligence
        </h1>
        <p className="max-w-2xl text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
          Track cash flow, cohort performance, and upcoming risk so finance and success teams know where to focus next.
        </p>
        {source === "fallback" && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
            <PieChart size={12} className="text-amber-200" />
            Stripe offline • viewing demo dataset
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 p-3 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span>Cash collected (90d)</span>
            <Wallet size={14} className="brand-text" />
          </div>
          <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {formatCurrency(paidValue)}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Includes live Stripe data when available.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-3 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span>Outstanding risk</span>
            <LineChart size={14} className="text-amber-300" />
          </div>
          <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {formatCurrency(outstandingValue)}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Overdue and open invoices awaiting settlement.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-3 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span>Recurring preview</span>
            <TrendingUp size={14} className="text-sky-300" />
          </div>
          <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {formatCurrency(recurringRequests.reduce((sum, req) => sum + req.amount, 0))}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            {recurringRequests.length} automation{recurringRequests.length === 1 ? "" : "s"} configured for subscriptions.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-3 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span>Data actions</span>
            <Download size={14} className="text-emerald-300" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportPayoutReport} className="inline-flex items-center gap-2 text-xs">
              <Download size={12} />
              Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const count = queueCollectionsReminder();
                alert(
                  count
                    ? `Queued reminders for ${count} invoice${count === 1 ? "" : "s"}.`
                    : "No outstanding invoices to remind."
                );
              }}
              className="inline-flex items-center gap-2 text-xs"
            >
              <PieChart size={12} />
              Queue reminders
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-white/10 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span>Cumulative cashflow</span>
            <span>{timeline.length} data points</span>
          </div>
          <CashflowSparkline data={timeline} />
          <div className="mt-3 grid gap-2 text-xs md:grid-cols-3" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            {timeline.map((point) => (
              <div key={point.key} className="rounded-lg bg-white/5 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide">{point.label}</div>
                <div className="mt-1 font-semibold" style={{ color: "var(--foreground)" }}>
                  {formatCurrency(point.collected)}
                </div>
                <div className="text-[11px]">
                  Outstanding: {formatCurrency(point.outstanding)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            Cohort performance
          </div>
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                <th className="py-2 text-left">Month</th>
                <th className="py-2 text-left">Issued</th>
                <th className="py-2 text-left">Paid</th>
                <th className="py-2 text-left">Outstanding</th>
                <th className="py-2 text-right">Collection</th>
              </tr>
            </thead>
            <tbody style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
              {cohorts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[11px]">
                    Add a few invoices to view cohort retention trends.
                  </td>
                </tr>
              ) : (
                cohorts.map((cohort) => (
                  <tr key={cohort.month} className="border-t border-white/5">
                    <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>
                      {cohort.month}
                    </td>
                    <td className="py-2">{cohort.issued}</td>
                    <td className="py-2">{cohort.paid}</td>
                    <td className="py-2">{cohort.outstanding}</td>
                    <td className="py-2 text-right">
                      {cohort.collectionRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Recent payment events
          </h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/payments")} className="text-xs">
            Open payments
          </Button>
        </div>
        <div className="mt-3 space-y-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {paymentEvents.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-[11px]">
              No payment events logged yet. Create or collect invoices to populate this feed.
            </div>
          ) : (
            paymentEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2" style={{ color: "var(--foreground)" }}>
                  <span className="text-sm font-semibold">{event.summary}</span>
                  <span className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {new Date(event.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {event.meta ? (
                  <pre className="mt-2 rounded bg-black/20 p-2 text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 65%)" }}>
                    {JSON.stringify(event.meta, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentsAnalyticsPage() {
  return (
    <AppShell>
      <PaymentsAnalyticsContent />
    </AppShell>
  );
}


