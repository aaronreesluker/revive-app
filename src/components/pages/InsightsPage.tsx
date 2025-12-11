"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, Bot, Clock3, Gauge, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { OperationTicketPreview } from "../operations/OperationTicketPreview";
import { useDashboardRecommendations, type DashboardRecommendation } from "@/hooks/useDashboardRecommendations";
import { useOperations, type OperationTicket } from "@/context/OperationsContext";
import { useLearning } from "@/context/LearningContext";

function TypeBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  const chars = Array.from(text);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="mb-3">
      <div
        className="rounded-2xl px-4 py-3 text-sm ring-1 app-ring"
        style={{
          color: "var(--foreground)",
          background: "color-mix(in oklab, var(--panel), transparent 10%)",
        }}
      >
        <span>
          {chars.map((c, i) => (
            <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + i * 0.015 }}>
              {c}
            </motion.span>
          ))}
        </span>
      </div>
    </motion.div>
  );
}

function formatRelativeTime(timestamp?: string | null) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return "—";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "just now";
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(diff / 60000));
    return `${minutes}m ago`;
  }
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function InsightsPage() {
  const router = useRouter();
  const { recommendations, loading: recommendationsLoading, meta } = useDashboardRecommendations();
  const { tickets, followUps, queueTicket } = useOperations();
  const { recordEvent } = useLearning();
  const [activeRecommendation, setActiveRecommendation] = useState<DashboardRecommendation | null>(null);
  const [ticketPreview, setTicketPreview] = useState<OperationTicket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const topRecommendations = recommendations.slice(0, 4);
  const openTickets = tickets.slice(0, 3);

  const followUpSummary = useMemo(() => {
    return followUps.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { open: 0, in_progress: 0, snoozed: 0, completed: 0 }
    );
  }, [followUps]);

  const handleQueueRecommendation = (item: DashboardRecommendation) => {
    const ticket = queueTicket({
      source: "insights",
      subject: item.title,
      summary: item.description,
      priority: item.emphasis === "critical" ? "urgent" : item.emphasis === "warning" ? "high" : "normal",
      metadata: { recommendationId: item.id },
    });
    setActiveRecommendation(item);
    setTicketPreview(ticket);
    setModalOpen(true);
    
    // Record learning event - user clicked on recommendation
    recordEvent({
      type: "recommendation_clicked",
      metadata: {
        recommendationId: item.id,
        category: item.badge.toLowerCase(),
        action: "queue_ticket",
      },
    });
  };

  const metricCards = [
    {
      label: "Outstanding GBP",
      value: meta.outstandingGBP ? `£${Math.round(meta.outstandingGBP).toLocaleString()}` : "£0",
      helper: `${meta.overdueInvoices} overdue invoices`,
      icon: <BarChart3 size={16} />,
    },
    {
      label: "Token Usage",
      value: `${Math.round(meta.tokenUsagePercent)}%`,
      helper: meta.lastAutoTopUpAt ? `Auto top-up ${formatRelativeTime(meta.lastAutoTopUpAt)}` : "No auto top-ups this week",
      icon: <Gauge size={16} />,
    },
    {
      label: "Follow-ups",
      value: `${followUps.length}`,
      helper: `${followUpSummary.open} open • ${followUpSummary.in_progress} in progress`,
      icon: <Clock3 size={16} />,
    },
  ];

  return (
    <>
      <div className="space-y-8">
        <div className="grid gap-5 md:grid-cols-3">
        {metricCards.map((card) => (
          <div key={card.label} className="card-glass flex items-start gap-4 rounded-xl p-6">
            <span className="brand-text mt-1">{card.icon}</span>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                {card.label}
              </div>
              <div className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
                {card.value}
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {card.helper}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="card-glass rounded-xl p-8">
            <div className="mb-6 flex items-center gap-3">
              <Sparkles size={22} className="brand-text" />
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                AI Insights
              </h3>
            </div>
            <div className="space-y-4">
              <TypeBubble text="Inbound response time beat your SLA by 83% — keep the receptionist playbook running." delay={0} />
              <TypeBubble text="Review velocity is trending up. 4.9★ average across the last 30 invites." delay={0.3} />
              <TypeBubble text="Tokens at 78% usage — prep add-ons or trigger the capacity boost." delay={0.6} />
            </div>
          </div>

          <div className="card-glass rounded-xl p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Recommended plays
              </h3>
              {recommendationsLoading && (
                <span className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  Refreshing insights…
                </span>
              )}
            </div>
            <div className="mt-6 space-y-4">
              {topRecommendations.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                        {item.badge}
                      </div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {item.title}
                      </h4>
                      <p className="text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                        {item.description}
                      </p>
                    </div>
                    {item.emphasis === "critical" && <AlertTriangle size={16} className="text-amber-300" />}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => router.push(item.primaryRoute)}
                      className="inline-flex items-center gap-1"
                    >
                      Go to {item.primaryLabel.toLowerCase()}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleQueueRecommendation(item)}
                      className="inline-flex items-center gap-1"
                    >
                      Queue ops ticket
                      <Bot size={14} />
                    </Button>
                    {item.secondaryRoute ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => item.secondaryRoute && router.push(item.secondaryRoute)}
                        className="inline-flex items-center gap-1"
                      >
                        {item.secondaryLabel}
                      </Button>
                    ) : null}
                    {item.metricLabel && item.metricValue ? (
                      <span className="ml-auto text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                        {item.metricLabel}: <strong style={{ color: "var(--foreground)" }}>{item.metricValue}</strong>
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Operations queue
              </h3>
              <Button size="sm" variant="ghost" onClick={() => router.push("/settings")} className="text-xs">
                View all
              </Button>
            </div>
            <div className="mt-5 space-y-4">
              {openTickets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  No active tickets. Queue a play from the list to brief the team.
                </div>
              ) : (
                openTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="text-xs uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                          {ticket.source}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          {ticket.subject}
                        </div>
                        <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                          Owner: {ticket.owner}
                        </p>
                      </div>
                      <span className="text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                        {formatRelativeTime(ticket.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-3 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                      {ticket.activities[0]?.summary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-glass rounded-xl p-6">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Follow-up tracker
            </h3>
            <p className="mt-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Monitor review tickets linked to the AI agent.
            </p>
            <div className="mt-5 grid gap-4 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  Open
                </div>
                <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
                  {followUpSummary.open}
                </div>
                <p className="mt-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Awaiting assignment
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  In progress
                </div>
                <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
                  {followUpSummary.in_progress}
                </div>
                <p className="mt-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Owners briefing customers
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  Snoozed
                </div>
                <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
                  {followUpSummary.snoozed}
                </div>
                <p className="mt-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Waiting for customer signal
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => router.push("/reviews")} className="mt-2">
                Manage follow-ups
              </Button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveRecommendation(null);
          setTicketPreview(null);
        }}
        title={activeRecommendation ? `Queued • ${activeRecommendation.title}` : "Ops ticket queued"}
      >
        {ticketPreview ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              We logged this play with the operations desk. Review the simulated timeline below.
            </div>
            <OperationTicketPreview ticket={ticketPreview} />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  setTicketPreview(null);
                  setModalOpen(false);
                }}
              >
                Close
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  router.push("/settings");
                  setModalOpen(false);
                }}
              >
                View operations desk
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Ticket queued successfully.
          </div>
        )}
      </Modal>
    </>
  );
}

