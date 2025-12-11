import { useEffect, useMemo, useState } from "react";
import { useTokens } from "@/context/TokenContext";
import { useTier } from "@/context/TierContext";
import { usePayments } from "./usePayments";
import type { StripeInvoice } from "@/lib/stripe-types";
import { daysSince, loadFallbackInvoices, type FollowUpContact } from "@/lib/dashboard-data";
import { useEventLog } from "@/context/EventLogContext";
import { useOperations } from "@/context/OperationsContext";
import { useLearning } from "@/context/LearningContext";

export type DashboardRecommendation = {
  id: string;
  badge: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryRoute: string;
  secondaryLabel?: string;
  secondaryRoute?: string;
  emphasis?: "info" | "warning" | "critical";
  metricLabel?: string;
  metricValue?: string;
  score: number;
};

type UseDashboardRecommendationsReturn = {
  recommendations: DashboardRecommendation[];
  loading: boolean;
  meta: {
    outstandingGBP: number;
    overdueInvoices: number;
    tokenUsagePercent: number;
    lastAutoTopUpAt: string | null;
  };
};

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function normaliseInvoices(source: StripeInvoice[], now: number) {
  return source.map((invoice) => ({
    ...invoice,
    dueDate: invoice.dueDate ?? Math.floor(now / 1000),
  }));
}

export function useDashboardRecommendations(): UseDashboardRecommendationsReturn {
  const { invoices, loading: paymentsLoading, error: paymentsError } = usePayments();
  const { remainingTokens, totalTokens, killswitchEnabled } = useTokens();
  const { tier } = useTier();
  const { events } = useEventLog();
  const { getRelevanceScore } = useLearning();

  const { followUps } = useOperations();
  const [cachedInvoices, setCachedInvoices] = useState<StripeInvoice[]>([]);

  useEffect(() => {
    if (paymentsLoading) return;
    if (invoices.length > 0) {
      setCachedInvoices(invoices);
      return;
    }
    if (paymentsError && cachedInvoices.length === 0) {
      setCachedInvoices(loadFallbackInvoices());
    }
  }, [invoices, paymentsLoading, paymentsError, cachedInvoices.length]);

  const lastAutoTopUp = useMemo(() => {
    const event = events.find((item) => item.action === "auto_top_up");
    if (!event) return null;
    const timestamp = Date.parse(event.createdAt);
    if (Number.isNaN(timestamp)) return null;
    return { event, timestamp };
  }, [events]);

  const recommendations = useMemo<DashboardRecommendation[]>(() => {
    const now = Date.now();
    const sourceInvoices = invoices.length ? invoices : cachedInvoices;
    const data: DashboardRecommendation[] = [];

    const describeRelativeTime = (timestamp: number) => {
      const diff = now - timestamp;
      if (diff <= 0) return "just now";
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) return "within the last hour";
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    if (sourceInvoices.length) {
      const prepared = normaliseInvoices(sourceInvoices, now);
      const overdue = prepared.filter((invoice) =>
        ["open", "uncollectible"].includes(invoice.status) && invoice.dueDate * 1000 < now
      );
      const overdueValue = overdue.reduce((sum, invoice) => sum + invoice.amount, 0);
      const upcoming = prepared.filter((invoice) =>
        invoice.status === "open" && invoice.dueDate * 1000 >= now && invoice.dueDate * 1000 <= now + 7 * 86400000
      );
      const upcomingValue = upcoming.reduce((sum, invoice) => sum + invoice.amount, 0);

      if (overdue.length > 0) {
        data.push({
          id: "recover-overdue",
          badge: "Finance",
          title: `Recover £${Math.round(overdueValue).toLocaleString()} in overdue revenue`,
          description:
            overdue.length === 1
              ? `${overdue[0].customerName} is ${daysSince(new Date(overdue[0].dueDate * 1000).toISOString())} days overdue. Trigger the collections workflow now.`
              : `${overdue.length} invoices are beyond terms. Launch the collections workflow before the aged debt grows.`,
          primaryLabel: "Open payments",
          primaryRoute: "/payments",
          secondaryLabel: "View aged debt",
          secondaryRoute: "/analytics/payments",
          emphasis: overdueValue > 1500 ? "critical" : "warning",
          metricLabel: "Outstanding",
          metricValue: GBP.format(overdueValue),
          score: Math.min(1, (overdueValue / 5000) + overdue.length * 0.05 + 0.2),
        });
      } else if (upcoming.length > 0) {
        data.push({
          id: "early-reminders",
          badge: "Finance",
          title: `Send pre-due reminders for ${upcoming.length} invoice${upcoming.length > 1 ? "s" : ""}`,
          description: `Keep cashflow smooth by nudging customers ahead of the due date. ${GBP.format(
            upcomingValue
          )} becomes due within 7 days.`,
          primaryLabel: "Schedule reminders",
          primaryRoute: "/payments",
          secondaryLabel: "Automate with workflows",
          secondaryRoute: "/workflows",
          emphasis: "info",
          metricLabel: "Due this week",
          metricValue: GBP.format(upcomingValue),
          score: 0.45 + upcoming.length * 0.03,
        });
      }
    }

    if (totalTokens > 0) {
      const usedTokens = totalTokens - remainingTokens;
      const usagePercent = (usedTokens / totalTokens) * 100;
      const autoTopUpNote =
        lastAutoTopUp && now - lastAutoTopUp.timestamp < 72 * 3600000
          ? ` Auto top-up fired ${describeRelativeTime(lastAutoTopUp.timestamp)}.`
          : "";
      if (usagePercent >= 85) {
        data.push({
          id: "token-capacity",
          badge: "Capacity",
          title: `Token usage at ${Math.round(usagePercent)}%. Prevent automation downtime.`,
          description: killswitchEnabled
            ? `Your kill switch is armed—automations will pause if you run dry.${autoTopUpNote || " Add capacity before you hit 100%."}`
            : `Auto top-ups will purchase booster packs shortly.${autoTopUpNote || " Review spend and adjust rules now."}`,
          primaryLabel: "Add more tokens",
          primaryRoute: "/settings",
          secondaryLabel: "View token analytics",
          secondaryRoute: "/analytics/tokens",
          emphasis: "critical",
          metricLabel: "Remaining",
          metricValue: `${Math.max(0, remainingTokens).toLocaleString()} tokens`,
          score: usagePercent >= 95 ? 0.95 : 0.8,
        });
      } else if (usagePercent >= 65) {
        data.push({
          id: "token-trend",
          badge: "Capacity",
          title: `Tracking ${Math.round(usagePercent)}% of this month's allowance`,
          description:
            "Usage is trending upward. Assess automation mix and plan top-ups so the team isn't throttled mid-campaign.",
          primaryLabel: "Inspect usage",
          primaryRoute: "/analytics/tokens",
          secondaryLabel: "Purchase add-ons",
          secondaryRoute: "/settings",
          emphasis: "warning",
          metricLabel: "Remaining",
          metricValue: `${Math.max(0, remainingTokens).toLocaleString()} tokens`,
          score: 0.6,
        });
      }
    }

    if (followUps.length) {
      const dormant = followUps.filter((entry) => daysSince(entry.lastTouchpoint) >= 45);
      const dormantValue = dormant.reduce((sum, entry) => sum + entry.annualValueGBP, 0);
      if (dormant.length > 0) {
        const topContact = dormant[0];
        data.push({
          id: "revive-dormant",
          badge: "Retention",
          title: `Re-activate ${dormant.length} high-value relationship${dormant.length > 1 ? "s" : ""}`,
          description: `${topContact.contactName} (${topContact.company ?? ""}) has been idle for ${daysSince(
            topContact.lastTouchpoint
          )} days. Launch a win-back workflow targeting premium clients.`,
          primaryLabel: "Open contacts",
          primaryRoute: "/contacts",
          secondaryLabel: (tier as string) === "enterprise" ? "Launch nurture journey" : "Preview automation",
          secondaryRoute: (tier as string) === "enterprise" ? "/workflows" : "/settings",
          emphasis: dormantValue > 70000 ? "critical" : "info",
          metricLabel: "At-risk ARR",
          metricValue: GBP.format(dormantValue),
          score: 0.55 + dormant.length * 0.04,
        });
      }
    }

    // Plan upgrade recommendation removed

    const deduped = data.filter((item, index, arr) => arr.findIndex((other) => other.id === item.id) === index);

    return deduped.sort((a, b) => b.score - a.score);
  }, [
    invoices,
    cachedInvoices,
    paymentsError,
    remainingTokens,
    totalTokens,
    killswitchEnabled,
    followUps,
    tier,
    getRelevanceScore,
  ]);

  const outstandingGBP = useMemo(() => {
    const source = invoices.length ? invoices : cachedInvoices;
    return source
      .filter((invoice) => ["open", "uncollectible"].includes(invoice.status))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
  }, [invoices, cachedInvoices]);

  const overdueInvoices = useMemo(() => {
    const source = invoices.length ? invoices : cachedInvoices;
    const now = Date.now();
    return source.filter(
      (invoice) => ["open", "uncollectible"].includes(invoice.status) && (invoice.dueDate || 0) * 1000 < now
    ).length;
  }, [invoices, cachedInvoices]);

  const tokenUsagePercent = useMemo(() => {
    if (totalTokens === 0) return 0;
    return ((totalTokens - remainingTokens) / totalTokens) * 100;
  }, [totalTokens, remainingTokens]);

  return {
    recommendations,
    loading: paymentsLoading && invoices.length === 0 && cachedInvoices.length === 0,
    meta: {
      outstandingGBP,
      overdueInvoices,
      tokenUsagePercent,
      lastAutoTopUpAt: lastAutoTopUp?.event.createdAt ?? null,
    },
  };
}
