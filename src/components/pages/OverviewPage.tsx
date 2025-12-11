"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageSquare, Calendar, PoundSterling, Clock, CheckCircle, AlertCircle, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../Button";
import { KpiCard } from "../KpiCard";
import { useDashboardRecommendations } from "@/hooks/useDashboardRecommendations";
import { recentReceptionistTriggers, recentPayments, recentActivity } from "@/data/dashboard";
import { useCurrentPlan } from "@/hooks/usePlanFeatures";
import { useAuth } from "@/context/AuthContext";
import { useSalesLeads } from "@/hooks/useSalesLeads";

export function OverviewPage() {
  const [kpiInteracted, setKpiInteracted] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { leads } = useSalesLeads();

  const timeline = Array.from({ length: 7 }).map((_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(),
    value: 40 + i * 5,
  }));

  const bullets = [
    "Automation triggered on new lead",
    "SMS reply within 5 minutes",
    "Calendar booking confirmed",
  ];

  const { recommendations: recommendedActions, loading: recommendationsLoading } = useDashboardRecommendations();
  const [actionIndex, setActionIndex] = useState(0);
  const { features } = useCurrentPlan();

  const isSalesUser = user?.role === "sales";

  const salesKpis = useMemo(() => {
    if (!leads.length) {
      return {
        pipelineValue: 0,
        pipelineWithVat: 0,
        closedRevenue: 0,
        winRate: 0,
        averageDeal: 0,
      };
    }
    const openLeads = leads.filter((l) => l.status !== "Closed" && l.status !== "Not Interested");
    const closedLeads = leads.filter((l) => l.status === "Closed");
    const pipelineValue = openLeads.reduce((sum, l) => sum + (l.currentPrice || 0), 0);
    const closedRevenue = closedLeads.reduce(
      (sum, l) => sum + (l.priceSoldAt || 0) + (l.upsellAmount || 0),
      0
    );
    const meetings = leads.filter((l) => l.status === "Appointment Booked" || l.status === "Closed");
    const winRate = meetings.length ? (closedLeads.length / meetings.length) * 100 : 0;
    const averageDeal = closedLeads.length ? closedRevenue / closedLeads.length : 0;

    return {
      pipelineValue,
      pipelineWithVat: pipelineValue * 1.2,
      closedRevenue,
      winRate,
      averageDeal,
    };
  }, [leads]);

  useEffect(() => {
    if (recommendedActions.length <= 1) return;
    const id = window.setInterval(() => {
      setActionIndex((prev) => (prev + 1) % recommendedActions.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, [recommendedActions.length]);

  useEffect(() => {
    if (recommendedActions.length === 0) return;
    if (actionIndex > recommendedActions.length - 1) {
      setActionIndex(0);
    }
  }, [actionIndex, recommendedActions.length]);

  const cycleAction = (delta: number) => {
    if (recommendedActions.length === 0) return;
    setActionIndex((prev) => (prev + delta + recommendedActions.length) % recommendedActions.length);
  };

  const currentAction = recommendedActions[actionIndex];

  return (
    <div className="space-y-2 md:space-y-3 lg:space-y-6">
      {currentAction ? (
        <div className="card-glass flex h-full flex-col gap-4 rounded-xl border border-white/10 p-4 md:p-5 md:flex-row md:items-stretch md:gap-6" style={{ background: "color-mix(in oklab, var(--panel), transparent 78%)" }}>
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand" style={{ color: "var(--brand)", background: "color-mix(in oklab, var(--brand), transparent 85%)" }}>
              <Sparkles size={18} />
            </div>
            <div>
              <p className="micro-title" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Recommended Action
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                  {actionIndex + 1}/{recommendedActions.length}
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.25em]"
                  style={{
                    color:
                      currentAction.emphasis === "critical"
                        ? "var(--status-critical, #f87171)"
                        : currentAction.emphasis === "warning"
                        ? "var(--status-warning, #fbbf24)"
                        : "color-mix(in oklab, var(--foreground), transparent 50%)",
                  }}
                >
                  {currentAction.badge}
                </span>
              </div>
              <p className="mt-2 text-xs md:text-sm font-semibold leading-relaxed" style={{ color: "var(--foreground)" }}>
                {currentAction.title}
              </p>
              <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                {currentAction.description}
              </p>
              {currentAction.metricLabel && currentAction.metricValue ? (
                <div
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] ring-1 app-ring"
                  style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {currentAction.metricLabel}
                  </span>
                  <span>{currentAction.metricValue}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-3 md:w-64">
            <div className="flex items-center gap-1 order-2 sm:order-1">
              <button type="button" className="mini-circle-nav min-h-[36px] md:min-h-0" onClick={() => cycleAction(-1)} aria-label="Previous recommendation">
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="mini-circle-nav min-h-[36px] md:min-h-0" onClick={() => cycleAction(1)} aria-label="Next recommendation">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="mt-auto flex flex-col sm:flex-col w-full sm:w-auto items-stretch sm:items-end gap-2 order-1 sm:order-2">
              <Button size="sm" onClick={() => currentAction.primaryRoute && router.push(currentAction.primaryRoute)} className="flex items-center gap-1 w-full sm:w-auto min-h-[44px] md:min-h-0 text-xs md:text-sm">
                {currentAction.primaryLabel}
              </Button>
              {currentAction.secondaryLabel && currentAction.secondaryRoute ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => currentAction.secondaryRoute && router.push(currentAction.secondaryRoute)}
                  className="flex items-center gap-1 border border-current/20 w-full sm:w-auto min-h-[44px] md:min-h-0 text-xs md:text-sm"
                  style={{ background: "transparent" }}
                >
                  {currentAction.secondaryLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card-glass flex flex-col gap-3 rounded-xl border border-white/10 p-5"
          style={{ background: "color-mix(in oklab, var(--panel), transparent 78%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand" style={{ color: "var(--brand)", background: "color-mix(in oklab, var(--brand), transparent 85%)" }}>
              <Sparkles size={18} />
            </div>
            <div>
              <p className="micro-title" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Recommended Action
              </p>
              <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                {recommendationsLoading ? "Analysing live data..." : "All clear for now. We'll surface the next best action as new signals arrive."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 md:gap-3 lg:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isSalesUser ? (
          <>
            <KpiCard
              label="Pipeline Value (ex VAT)"
              value={`£${Math.round(salesKpis.pipelineValue).toLocaleString("en-GB")}`}
              delta={18}
              intent="good"
              drilldown={{
                title: "Open Pipeline Value",
                timeline,
                bullets,
              }}
            />
            <KpiCard
              label="Pipeline incl. 20% VAT"
              value={`£${Math.round(salesKpis.pipelineWithVat).toLocaleString("en-GB")}`}
              delta={12}
              intent="good"
              drilldown={{
                title: "Pipeline with VAT",
                timeline,
                bullets,
              }}
            />
            <KpiCard
              label="Win Rate"
              value={`${salesKpis.winRate.toFixed(1)}%`}
              delta={9}
              intent={salesKpis.winRate >= 40 ? "good" : "neutral"}
              drilldown={{
                title: "Win Rate",
                timeline,
                bullets,
              }}
            />
            <KpiCard
              label="Avg Deal Size"
              value={`£${Math.round(salesKpis.averageDeal).toLocaleString("en-GB")}`}
              delta={6}
              intent="good"
              drilldown={{
                title: "Average Deal Size",
                timeline,
                bullets,
              }}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Leads Received"
              value={42}
              delta={18}
              intent="good"
              onInteract={() => setKpiInteracted(true)}
              drilldown={{
                title: "Leads Received",
                timeline,
                bullets,
              }}
            />
            <KpiCard
              label="Bookings"
              value={12}
              delta={12}
              intent="good"
              drilldown={{
                title: "Bookings",
                timeline,
                bullets,
              }}
            />
            <KpiCard
              label="Show Rate"
              value="92%"
              delta={9}
              intent="good"
              drilldown={{
                title: "Show Rate",
                timeline,
                bullets,
              }}
            />
            <KpiCard
              label="Review Rate"
              value="4.9★"
              delta={6}
              intent="good"
              drilldown={{
                title: "Review Rate",
                timeline,
                bullets,
              }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 md:gap-3 lg:gap-4 lg:grid-cols-3">
        {/* Recent Receptionist Triggers */}
        {features.aiReceptionist ? (
        <div className="card-glass rounded-xl p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs md:text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
              Recent AI Receptionist Activity
            </h3>
            <Phone size={14} className="md:w-4 md:h-4 brand-text flex-shrink-0" />
          </div>
          <div className="space-y-2 md:space-y-3">
            {recentReceptionistTriggers.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-start gap-2 md:gap-3 rounded-lg p-2 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {trigger.type === "call" ? (
                    <Phone size={12} className="md:w-3.5 md:h-3.5 brand-text" />
                  ) : (
                    <MessageSquare size={12} className="md:w-3.5 md:h-3.5 brand-text" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] md:text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {trigger.contact}
                  </div>
                  <div className="text-[10px] md:text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                    {trigger.action}
                  </div>
                  <div className="mt-0.5 md:mt-1 text-[10px] md:text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {trigger.time}
                  </div>
                </div>
                {trigger.status === "success" && (
                  <CheckCircle size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0 text-emerald-400" />
                )}
              </div>
            ))}
          </div>
          {user?.role === "admin" ? (
            <button
              onClick={() => router.push("/receptionist")}
              className="mt-3 w-full rounded-md bg-zinc-900/60 px-3 py-2 md:py-1.5 text-[11px] md:text-xs ring-1 app-ring hover:opacity-90 min-h-[44px] md:min-h-0"
            >
              View Receptionist Queue
            </button>
          ) : (
            <button
              onClick={() => router.push("/contacts")}
              className="mt-3 w-full rounded-md bg-zinc-900/60 px-3 py-2 md:py-1.5 text-[11px] md:text-xs ring-1 app-ring hover:opacity-90 min-h-[44px] md:min-h-0"
            >
              View Related Contacts
            </button>
          )}
        </div>
        ) : (
          <div className="card-glass rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                AI Receptionist
              </h3>
              <Phone size={16} className="brand-text" />
            </div>
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                AI receptionist answers calls and SMS 24/7, handles bookings, and routes inquiries automatically.
              </p>
            </div>
            <button
              onClick={() => router.push("/receptionist")}
              className="mt-3 w-full rounded-md brand-bg px-3 py-1.5 text-xs font-medium text-black ring-1 app-ring hover:opacity-90"
            >
              Open Receptionist
            </button>
          </div>
        )}

        {/* Recent Payments */}
        <div className="card-glass rounded-xl p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs md:text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
              Recent Payments
            </h3>
            <PoundSterling size={14} className="md:w-4 md:h-4 brand-text flex-shrink-0" />
          </div>
          <div className="space-y-2 md:space-y-3">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-start justify-between gap-2 md:gap-3 rounded-lg p-2 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] md:text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {payment.customer}
                  </div>
                  <div className="text-[10px] md:text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                    {payment.invoice}
                  </div>
                  <div className="mt-0.5 md:mt-1 text-[10px] md:text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {payment.date}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-[11px] md:text-xs font-semibold whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    £{payment.amount.toLocaleString()}
                  </div>
                  <span
                    className={`rounded-full px-1.5 md:px-2 py-0.5 text-[9px] md:text-xs whitespace-nowrap ${
                      payment.status === "paid"
                        ? "bg-emerald-600/20 text-emerald-300"
                        : payment.status === "overdue"
                        ? "bg-rose-600/20 text-rose-300"
                        : "bg-yellow-600/20 text-yellow-300"
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/payments")}
            className="mt-3 w-full rounded-md bg-zinc-900/60 px-3 py-2 md:py-1.5 text-[11px] md:text-xs ring-1 app-ring hover:opacity-90 min-h-[44px] md:min-h-0"
          >
            View All Payments
          </button>
        </div>

        {/* Activity Feed */}
        <div className="card-glass rounded-xl p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs md:text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
              Activity Feed
          </h3>
            <Clock size={14} className="md:w-4 md:h-4 brand-text flex-shrink-0" />
          </div>
          <div className="space-y-2 md:space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-2 md:gap-3 rounded-lg p-2 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0 brand-text text-xs md:text-sm">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] md:text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 20%)" }}>
                    {activity.message}
                  </div>
                  <div className="mt-0.5 md:mt-1 text-[10px] md:text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/activity")}
            className="mt-3 w-full rounded-md bg-zinc-900/60 px-3 py-2 md:py-1.5 text-[11px] md:text-xs ring-1 app-ring hover:opacity-90 min-h-[44px] md:min-h-0"
          >
            View Full Activity
          </button>
        </div>
        <div className="card-glass rounded-xl p-3 md:p-4 lg:p-5 shadow-lg shadow-cyan-500/15 lg:col-span-3">
          <h3 className="mb-3 text-xs md:text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Quick Actions
          </h3>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            <button
              onClick={() => router.push("/contacts")}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              Add Contact
            </button>
            <button
              onClick={() => router.push("/workflows")}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              Request Automation
            </button>
            <button
              onClick={() => {
                alert("Review request workflow will be triggered for completed jobs in the last 7 days.");
              }}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              Request Review
            </button>
            <button
              onClick={() => router.push("/payments")}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              View Payments
            </button>
            <button
              onClick={() => router.push("/analytics/tokens")}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              Token Analytics
            </button>
            <button
              onClick={() => router.push("/receptionist")}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              Flag Receptionist Call
            </button>
            <button
              onClick={() => router.push("/reviews")}
              className="w-full rounded-lg brand-bg px-3 py-2.5 md:py-2 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm transition hover:opacity-95 hover:shadow-md uppercase min-h-[44px] md:min-h-0"
              style={{ color: "var(--foreground)" }}
            >
              View Follow-ups
            </button>
        </div>
      </div>
    </div>
    </div>
  );
}

