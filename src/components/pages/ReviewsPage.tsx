"use client";

import { FormEvent, useMemo, useState } from "react";
import { Star, Zap, Clock, MessageSquare, TrendingUp, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { useOperations, type OperationTicket } from "../../context/OperationsContext";
import { OperationTicketPreview } from "../operations/OperationTicketPreview";
import { Select } from "../Select";
import type { FollowUpContact, FollowUpStatus, FollowUpActivity } from "@/lib/dashboard-data";

type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  source: string;
};

const mockReviews: Review[] = [
  {
    id: "r1",
    author: "Alex C.",
    rating: 5,
    text: "Great experience — fast and professional!",
    date: "Today",
    source: "Google",
  },
  {
    id: "r2",
    author: "Jordan M.",
    rating: 4,
    text: "On time and clean work.",
    date: "2d ago",
    source: "Facebook",
  },
  {
    id: "r3",
    author: "Priya K.",
    rating: 5,
    text: "Booked again next month.",
    date: "5d ago",
    source: "Google",
  },
];

const followUpStatusPalette: Record<FollowUpStatus, { background: string; border: string; color: string }> = {
  open: { background: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#93c5fd" },
  in_progress: { background: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#6ee7b7" },
  snoozed: { background: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", color: "#fcd34d" },
  completed: { background: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.35)", color: "#a5b4fc" },
};

function formatFollowUpStatus(status: FollowUpStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimelineTimestamp(value: string) {
  try {
    const date = new Date(value);
    return date.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  } catch {
    return value;
  }
}

export function ReviewsPage() {
  const [reviews] = useState<Review[]>(mockReviews);
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3">("all");
  const { followUps, assignFollowUp, snoozeFollowUp, completeFollowUp, queueTicket } = useOperations();
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState<FollowUpContact | null>(null);
  const [followUpTicket, setFollowUpTicket] = useState<OperationTicket | null>(null);
  const [modalNotice, setModalNotice] = useState<string | null>(null);

  const agentMetrics = {
    responseRate: 0.94,
    firstReplyMinutes: 7,
    autopublishShare: 0.76,
    escalationsThisWeek: 2,
  };

  const weeklyHighlights = [
    {
      id: "h1",
      title: "32 new reviews captured",
      detail: "18 invites triggered automatically after completed jobs.",
      icon: <Sparkles size={15} className="text-amber-300" />,
    },
    {
      id: "h2",
      title: "11 customer replies drafted",
      detail: "Agent suggested context-aware follow ups for long-form reviews.",
      icon: <MessageSquare size={15} className="text-sky-300" />,
    },
    {
      id: "h3",
      title: "3 at-risk tickets recovered",
      detail: "Resolved within 1 hour after escalation to the success team.",
      icon: <AlertTriangle size={15} className="text-rose-300" />,
    },
  ];

  const filtered = reviews.filter((r) => filter === "all" || r.rating.toString() === filter);
  const orderedFollowUps = useMemo(() => {
    const order: Record<FollowUpStatus, number> = { open: 0, in_progress: 1, snoozed: 2, completed: 3 };
    return [...followUps].sort((a, b) => order[a.status] - order[b.status]);
  }, [followUps]);

  return (
    <>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <div className="card-glass flex flex-col gap-1 rounded-xl p-4">
            <div className="micro-title flex items-center gap-2">
              <TrendingUp size={14} className="brand-text" />
              <span>Review Response Rate</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              {(agentMetrics.responseRate * 100).toFixed(0)}%
            </div>
            <p className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Replies sent within SLA over the last 7 days.
            </p>
          </div>
          <div className="card-glass flex flex-col gap-1 rounded-xl p-4">
            <div className="micro-title flex items-center gap-2">
              <Clock size={14} className="text-emerald-300" />
              <span>First Reply Speed</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              {agentMetrics.firstReplyMinutes}m
            </div>
            <p className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Median minutes from review to agent response.
            </p>
          </div>
          <div className="card-glass flex flex-col gap-1 rounded-xl p-4">
            <div className="micro-title flex items-center gap-2">
              <Zap size={14} className="text-sky-300" />
              <span>Auto-published Reviews</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              {(agentMetrics.autopublishShare * 100).toFixed(0)}%
            </div>
            <p className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Positive reviews pushed live with no human input.
            </p>
          </div>
          <div className="card-glass flex flex-col gap-1 rounded-xl p-4">
            <div className="micro-title flex items-center gap-2">
              <CheckCircle2 size={14} className="text-amber-200" />
              <span>Escalations this week</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
              {agentMetrics.escalationsThisWeek}
            </div>
            <p className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Reviews that needed manual attention from the team.
            </p>
          </div>
        </div>
        <div className="card-glass flex w-full flex-col gap-3 rounded-xl p-4 lg:w-[320px] xl:w-[360px]">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Review Agent Highlights
          </h3>
          <div className="space-y-2">
            {weeklyHighlights.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mt-0.5">{item.icon}</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {item.title}
                  </p>
                  <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[7fr,5fr]">
        <div className="space-y-4">
          <div className="card-glass rounded-xl p-5">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Follow-up queue
            </h3>
            <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Active review workflows the agent is tracking.
            </p>
            <div className="mt-4 space-y-3">
              {orderedFollowUps.map((item) => {
                const palette = followUpStatusPalette[item.status];
                return (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          <span>{item.contactName}</span>
                          {item.company ? (
                            <span className="text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                              • {item.company}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                          {item.reason === "idle" && "Dormant relationship"}
                          {item.reason === "missed_call" && "Missed receptionist call"}
                          {item.reason === "invoice" && "Billing follow-up"}
                          {item.reason === "custom" && "Custom follow-up"}
                          {" • "}
                          Last touch {new Date(item.lastTouchpoint).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide self-start"
                        style={{ background: palette.background, border: `1px solid ${palette.border}`, color: palette.color }}
                      >
                        {formatFollowUpStatus(item.status)}
                        {item.snoozedUntil && item.status === "snoozed" ? (
                          <span className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                            until {new Date(item.snoozedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          Owner:
                          <span className="font-medium" style={{ color: "var(--foreground)" }}>
                            {item.assignedTo ?? "Unassigned"}
                          </span>
                        </span>
                        <span>Value £{item.annualValueGBP.toLocaleString()}</span>
                      </div>
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-100"
                        onClick={() => {
                          setActiveFollowUp(item);
                          setFollowUpTicket(null);
                          setModalNotice(null);
                          setFollowUpModalOpen(true);
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card-glass rounded-xl p-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Invite Performance
          </h3>
          <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Breakdown of how review invites performed this week.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                <span>SMS Invites</span>
                <span>62% converted</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full brand-bg" style={{ width: "62%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                <span>Email Invites</span>
                <span>41% converted</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: "41%", background: "color-mix(in oklab, var(--brand), transparent 25%)" }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                <span>Agent follow-up invites</span>
                <span>83% converted</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: "83%", background: "color-mix(in oklab, var(--brand), white 20%)" }}></div>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Next experiment queued: test a handwritten-style MMS invite for premium clients. Launching Monday.
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1.5 text-xs ring-1 ${filter === "all" ? "app-ring brand-text" : "ring-transparent"}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("5")}
          className={`rounded-md px-3 py-1.5 text-xs ring-1 ${filter === "5" ? "app-ring brand-text" : "ring-transparent"}`}
        >
          5★
        </button>
        <button
          onClick={() => setFilter("4")}
          className={`rounded-md px-3 py-1.5 text-xs ring-1 ${filter === "4" ? "app-ring brand-text" : "ring-transparent"}`}
        >
          4★
        </button>
        <button
          onClick={() => setFilter("3")}
          className={`rounded-md px-3 py-1.5 text-xs ring-1 ${filter === "3" ? "app-ring brand-text" : "ring-transparent"}`}
        >
          3★
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((review) => (
          <div key={review.id} className="card-glass rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium">{review.author}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    {review.source}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>
                  {review.text}
                </p>
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                {review.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

      <Modal
        open={followUpModalOpen}
        onClose={() => {
          setFollowUpModalOpen(false);
          setActiveFollowUp(null);
          setFollowUpTicket(null);
          setModalNotice(null);
        }}
        title={activeFollowUp ? `Manage ${activeFollowUp.contactName}` : "Manage follow-up"}
      >
        {activeFollowUp ? (
          followUpTicket ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                Escalation queued with the ops desk. Review the simulated ticket timeline below.
              </div>
              <OperationTicketPreview ticket={followUpTicket} />
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setFollowUpTicket(null);
                  }}
                >
                  Back to follow-up
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setFollowUpModalOpen(false);
                    setActiveFollowUp(null);
                    setFollowUpTicket(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {modalNotice ? (
                <div className="rounded-lg border border-sky-400/25 bg-sky-400/10 p-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                  {modalNotice}
                </div>
              ) : null}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {activeFollowUp.contactName}
                    </p>
                    {activeFollowUp.company ? (
                      <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                        {activeFollowUp.company}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      Value £{activeFollowUp.annualValueGBP.toLocaleString()} • Last touch {new Date(activeFollowUp.lastTouchpoint).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide self-start"
                    style={{
                      background: followUpStatusPalette[activeFollowUp.status].background,
                      border: `1px solid ${followUpStatusPalette[activeFollowUp.status].border}`,
                      color: followUpStatusPalette[activeFollowUp.status].color,
                    }}
                  >
                    {formatFollowUpStatus(activeFollowUp.status)}
                  </span>
                </div>
                <div className="mt-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Owner: {activeFollowUp.assignedTo ?? "Unassigned"}
                  {activeFollowUp.snoozedUntil ? ` • Snoozed until ${new Date(activeFollowUp.snoozedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="micro-title">Activity trail</div>
                <ul className="mt-3 space-y-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  {activeFollowUp.activities.map((activity: FollowUpActivity) => (
                    <li key={activity.id} className="rounded-md border border-white/10 bg-black/10 p-2">
                      <div className="flex items-center justify-between text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                        <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                          {activity.summary}
                        </span>
                        <span>{formatTimelineTimestamp(activity.createdAt)}</span>
                      </div>
                      <div className="mt-1 text-[10px]">
                        {activity.actor}
                        {activity.note ? ` • ${activity.note}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    if (!activeFollowUp) return;
                    const formData = new FormData(event.currentTarget);
                    const owner = String(formData.get("owner") ?? "");
                    if (!owner) {
                      setModalNotice("Select an owner before assigning.");
                      return;
                    }
                    const note = String(formData.get("note") ?? "").trim();
                    assignFollowUp(activeFollowUp.id, owner, note);
                    setModalNotice(`Assigned to ${owner}. Timeline updated.`);
                    setFollowUpTicket(null);
                    event.currentTarget.reset();
                  }}
                  className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs"
                >
                  <div className="micro-title">Assign owner</div>
                  <Select
                    name="owner"
                    defaultValue=""
                    placeholder="Select ops owner"
                    options={[
                      { value: "", label: "Select ops owner", disabled: true },
                      ...["Alice Shaw", "Ethan Miller", "Priya Kendre", "Jordan Blake"].map((owner) => ({
                        value: owner,
                        label: owner,
                      })),
                    ]}
                  />
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Optional note"
                    className="w-full rounded-md bg-transparent px-2 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
                  />
                  <Button type="submit" size="sm" className="w-full">
                    Assign owner
                  </Button>
                </form>
                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    if (!activeFollowUp) return;
                    const formData = new FormData(event.currentTarget);
                    const until = String(formData.get("until") ?? "");
                    if (!until) {
                      setModalNotice("Select a snooze resume time.");
                      return;
                    }
                    const note = String(formData.get("note") ?? "").trim();
                    snoozeFollowUp(activeFollowUp.id, until, note);
                    setModalNotice(`Snoozed until ${new Date(until).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`);
                    setFollowUpTicket(null);
                  }}
                  className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs"
                >
                  <div className="micro-title">Snooze follow-up</div>
                  <input
                    name="until"
                    type="datetime-local"
                    defaultValue={new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16)}
                    className="w-full rounded-md bg-transparent px-2 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
                  />
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Reason for snooze"
                    className="w-full rounded-md bg-transparent px-2 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="w-full">
                    Snooze
                  </Button>
                </form>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Button
                  variant="ghost"
                  className="md:flex-1"
                  onClick={() => {
                    if (!activeFollowUp) return;
                    completeFollowUp(activeFollowUp.id);
                    setModalNotice("Marked as complete. Timeline updated.");
                    setFollowUpTicket(null);
                  }}
                >
                  Mark as complete
                </Button>
                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    if (!activeFollowUp) return;
                    const formData = new FormData(event.currentTarget);
                    const owner = String(formData.get("owner") ?? "");
                    const note = String(formData.get("note") ?? "").trim();
                    const ticket = queueTicket({
                      source: "reviews",
                      subject: `Review follow-up • ${activeFollowUp.contactName}`,
                      summary: `${activeFollowUp.reason === "idle" ? "Dormant client" : "Escalated review"}. ${note || "Ops to draft personalised outreach."}`,
                      priority: activeFollowUp.importance === "high" ? "urgent" : "high",
                      ownerHint: owner,
                      metadata: {
                        followUpId: activeFollowUp.id,
                        importance: activeFollowUp.importance,
                      },
                    });
                    setFollowUpTicket(ticket);
                    setModalNotice(null);
                    event.currentTarget.reset();
                  }}
                  className="flex-1 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs"
                >
                  <div className="micro-title">Escalate to ops</div>
                  <Select
                    name="owner"
                    defaultValue=""
                    options={[
                      { value: "", label: "Auto-assign (ops desk)" },
                      ...["Alice Shaw", "Ethan Miller", "Priya Kendre", "Jordan Blake"].map((owner) => ({
                        value: owner,
                        label: owner,
                      })),
                    ]}
                  />
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Context for escalation"
                    className="w-full rounded-md bg-transparent px-2 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
                  />
                  <Button type="submit" size="sm" className="w-full">
                    Queue ops ticket
                  </Button>
                </form>
              </div>
            </div>
          )
        ) : (
          <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            Select a follow-up from the queue to manage.
          </div>
        )}
      </Modal>
    </>
  );
}

