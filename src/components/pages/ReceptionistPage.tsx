"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  PhoneCall,
  PhoneIncoming,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Headset,
  Sparkles,
  ArrowRight,
  UserPlus,
  CalendarDays,
} from "lucide-react";
import { Button } from "../Button";
import { cn } from "../../lib/utils";
import { Modal } from "../Modal";
import { useOperations, type OperationTicket } from "../../context/OperationsContext";
import { OperationTicketPreview } from "../operations/OperationTicketPreview";
import { Select } from "../Select";
import { useCurrentPlan } from "@/hooks/usePlanFeatures";
import { useRouter } from "next/navigation";

type Conversation = {
  id: number;
  contact: string;
  summary: string;
  channel: "call" | "sms";
  timeAgo: string;
  intent: "booking" | "question" | "follow-up";
  status: "scheduled" | "resolved" | "needs-review";
};

const liveQueue = [
  { id: 1, caller: "Sarah Johnson", reason: "Reschedule appointment", wait: "00:01:32" },
  { id: 2, caller: "Daniel Clark", reason: "Quote for kitchen renovation", wait: "00:02:08" },
];

const conversations: Conversation[] = [
  {
    id: 1,
    contact: "Mike Chen",
    summary: "Booked boiler repair for Tuesday 11am. Sent confirmation SMS.",
    channel: "call",
    timeAgo: "4 min ago",
    intent: "booking",
    status: "scheduled",
  },
  {
    id: 2,
    contact: "Emma Davis",
    summary: "Answered pricing question, tagged as warm lead, sent follow-up email.",
    channel: "sms",
    timeAgo: "12 min ago",
    intent: "question",
    status: "resolved",
  },
  {
    id: 3,
    contact: "Robert Wilson",
    summary: "Requested callback from owner regarding expansion project.",
    channel: "call",
    timeAgo: "27 min ago",
    intent: "follow-up",
    status: "needs-review",
  },
];

const followUps = [
  { id: 1, contact: "Lisa Anderson", action: "Send proposal PDF", due: "Today 4:30 PM" },
  { id: 2, contact: "David Brown", action: "Confirm payment plan update", due: "Tomorrow 9:00 AM" },
  { id: 3, contact: "Jennifer Lee", action: "Share before/after gallery", due: "Tomorrow 12:00 PM" },
];

const automationSummary = [
  {
    id: "call-routing",
    title: "Smart call routing",
    detail: "92% of calls answered within 3 rings",
    icon: <Headset size={16} />,
  },
  {
    id: "lead-capture",
    title: "Lead capture",
    detail: "11 new contacts synced to CRM this week",
    icon: <UserPlus size={16} />,
  },
  {
    id: "appointment",
    title: "Appointment scheduling",
    detail: "7 bookings confirmed via receptionist",
    icon: <CalendarDays size={16} />,
  },
];

export function ReceptionistPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0]);
  const [activeModal, setActiveModal] = useState<"routing" | "escalation" | "suggestion" | "ticket" | null>(null);
  const [ticketPreview, setTicketPreview] = useState<OperationTicket | null>(null);
  const [ticketModalTitle, setTicketModalTitle] = useState<string>("Ops ticket queued");
  const [replySuggestion, setReplySuggestion] = useState<{ contact: string; body: string } | null>(null);
  const { queueTicket } = useOperations();
  const { features, plan } = useCurrentPlan();
  const router = useRouter();

  // Gate access to AI Receptionist feature
  if (!features.aiReceptionist) {
    // All features enabled for in-house use - no plan restrictions
    return null;
  }

  const stats = useMemo(
    () => [
      { label: "Live calls", value: "2", helper: "Queue time under 3 min", icon: <PhoneIncoming size={16} /> },
      { label: "Resolved today", value: "38", helper: "91% satisfaction", icon: <CheckCircle2 size={16} /> },
      { label: "Avg handle time", value: "01:47", helper: "Down 18% vs last week", icon: <Clock size={16} /> },
    ],
    []
  );

  const flaggedConversations = conversations.filter((conversation) => conversation.status === "needs-review");
  const ownerOptions = ["Alice Shaw", "Ethan Miller", "Priya Kendre", "Jordan Blake"];
  const defaultSnoozeUntil = new Date(Date.now() + 60 * 60000).toISOString().slice(0, 16);
  const downloadTranscripts = () => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        selectedConversationId: selectedConversation?.id ?? null,
        conversations,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `receptionist-transcripts-${Date.now()}.json`;
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const buildReplySuggestion = (conversation: Conversation) => {
    if (!conversation) {
      return "No conversation selected.";
    }
    switch (conversation.intent) {
      case "booking":
        return `Hi ${conversation.contact.split(" ")[0]}, just confirming your appointment for Tuesday at 11am. Let us know if you need to tweak anything before then!`;
      case "question":
        return `Hi ${conversation.contact.split(" ")[0]}, great question earlier. I've attached the pricing sheet and a quick summary of the options we discussed—shout if you'd like us to put together a custom quote.`;
      case "follow-up":
      default:
        return `Hi ${conversation.contact.split(" ")[0]}, thanks for reaching out. I'm looping in our senior team now and will have an update for you shortly—feel free to reply here if anything changes.`;
    }
  };

  const handleQueueTicket = (payload: Parameters<typeof queueTicket>[0], title: string) => {
    const ticket = queueTicket(payload);
    setTicketPreview(ticket);
    setTicketModalTitle(title);
    setActiveModal("ticket");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm"
            style={{ background: "color-mix(in oklab, var(--panel), transparent 78%)" }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              <span className="brand-text">{stat.icon}</span>
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {stat.value}
            </div>
            <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              {stat.helper}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Conversation workspace
              </h3>
              <Button
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-1"
                onClick={() => {
                  if (!selectedConversation) return;
                  setReplySuggestion({
                    contact: selectedConversation.contact,
                    body: buildReplySuggestion(selectedConversation),
                  });
                  setActiveModal("suggestion");
                }}
              >
                <Sparkles size={14} />
                Suggest reply
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const active = selectedConversation?.id === conversation.id;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-all",
                        active ? "border-brand/70 bg-white/10" : "border-white/5 bg-white/5 hover:border-brand/50"
                      )}
                      style={{ background: active ? "color-mix(in oklab, var(--panel), transparent 60%)" : "color-mix(in oklab, var(--panel), transparent 85%)" }}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                        {conversation.channel === "call" ? <PhoneCall size={14} /> : <MessageCircle size={14} />}
                        {conversation.timeAgo}
                      </div>
                      <div className="mt-1 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {conversation.contact}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                        {conversation.summary}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-white/5 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
                {selectedConversation ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                          Summary
                        </div>
                        <div className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                          {selectedConversation.contact}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          selectedConversation.status === "scheduled" && "bg-emerald-400/10 text-emerald-300",
                          selectedConversation.status === "resolved" && "bg-sky-400/10 text-sky-300",
                          selectedConversation.status === "needs-review" && "bg-amber-400/10 text-amber-300"
                        )}
                        style={{ border: "1px solid color-mix(in oklab, var(--ring), transparent 60%)" }}
                      >
                        {selectedConversation.status === "needs-review" ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                        {selectedConversation.status.replace("-", " ")}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                      {selectedConversation.summary}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="inline-flex items-center justify-center gap-1"
                        onClick={() => {
                          if (!selectedConversation) return;
                          handleQueueTicket(
                            {
                              source: "receptionist",
                              subject: `Callback • ${selectedConversation.contact}`,
                              summary: `Schedule a callback for ${selectedConversation.contact}. Intent: ${selectedConversation.intent}. Status: ${selectedConversation.status}.`,
                              priority: selectedConversation.status === "needs-review" ? "urgent" : "high",
                              ownerHint: "Reception Team",
                              metadata: {
                                conversationId: selectedConversation.id,
                                channel: selectedConversation.channel,
                              },
                            },
                            "Callback queued"
                          );
                        }}
                      >
                        <PhoneCall size={14} />
                        Call back now
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="inline-flex items-center justify-center gap-1"
                        onClick={() => {
                          if (!selectedConversation) return;
                          handleQueueTicket(
                            {
                              source: "receptionist",
                              subject: `Follow-up SMS • ${selectedConversation.contact}`,
                              summary: `Send a personalised SMS recap for ${selectedConversation.contact}. Conversation summary: ${selectedConversation.summary}`,
                              priority: "normal",
                              ownerHint: "SMS Desk",
                              metadata: {
                                conversationId: selectedConversation.id,
                                intent: selectedConversation.intent,
                              },
                            },
                            "Follow-up SMS queued"
                          );
                        }}
                      >
                        <MessageCircle size={14} />
                        Send follow-up SMS
                      </Button>
                    </div>
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-200">
                      View full transcript <ArrowRight size={12} />
                    </button>
                  </>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    Select a conversation to review details
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    Live queue
                  </h4>
                  <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                    94% of callers answered within SLA
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                onClick={() => {
                  setTicketPreview(null);
                  setActiveModal("routing");
                }}
                >
                  Manage routing
                </Button>
              </div>
              <div className="space-y-3">
                {liveQueue.map((call) => (
                  <div key={call.id} className="rounded-lg border border-white/5 p-3" style={{ background: "color-mix(in oklab, var(--panel), transparent 78%)" }}>
                    <div className="flex items-center justify-between text-sm" style={{ color: "var(--foreground)" }}>
                      <span>{call.caller}</span>
                      <span className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                        Wait {call.wait}
                      </span>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      {call.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
              <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Follow-ups for the team
              </h4>
              <ul className="mt-3 space-y-3">
                {followUps.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/5 p-3" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {item.contact}
                      </span>
                      <span className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                        {item.due}
                      </span>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      {item.action}
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 inline-flex items-center gap-1 text-xs"
                onClick={() => {
                  window.open("https://crm.revivedemo.ai/tasks?ref=receptionist", "_blank", "noopener,noreferrer");
                }}
              >
                View tasks in CRM <ArrowRight size={12} />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 88%)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Automations triggered today
              </h4>
              <span className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                14 sequences in-flight
              </span>
            </div>
            <div className="space-y-3">
              {automationSummary.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-white/5 p-3" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
                  <span className="brand-text mt-0.5">{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {item.title}
                    </div>
                    <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      {item.detail}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleQueueTicket(
                        {
                          source: "receptionist",
                          subject: `Automation review • ${item.title}`,
                          summary: `${item.detail}. Verify configuration and update call flow if needed.`,
                          priority: "high",
                          metadata: { automationId: item.id },
                        },
                        `${item.title} ticket queued`
                      )
                    }
                  >
                    Configure
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-5 text-sm backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 90%)", color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              <AlertTriangle size={14} />
              Escalations
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>
              3 calls flagged for manager review today. Assign owner and send quick context to keep customers informed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTicketPreview(null);
                  setActiveModal("escalation");
                }}
              >
                View flagged calls
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadTranscripts}>
                Export transcripts
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

      <Modal
        open={activeModal === "routing"}
        onClose={() => {
          setActiveModal(null);
          setTicketPreview(null);
        }}
        title="Queue routing adjustment"
      >
        {ticketPreview && activeModal === "routing" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              Routing task logged with the ops desk. Track the simulated timeline below.
            </div>
            <OperationTicketPreview ticket={ticketPreview} />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  setTicketPreview(null);
                }}
              >
                Queue another adjustment
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setActiveModal(null);
                  setTicketPreview(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const intent = String(formData.get("intent") ?? "Rebalance call routing");
              const window = String(formData.get("window") ?? "Next 4 hours");
              const note = String(formData.get("note") ?? "").trim();
              const owner = String(formData.get("owner") ?? "");
              const ticket = queueTicket({
                source: "receptionist",
                subject: `Routing tweak • ${intent}`,
                summary: `${intent}. Impact window: ${window}. ${note || "Ops team will follow the default escalation template."}`,
                priority: window.includes("Now") ? "urgent" : "high",
                ownerHint: owner,
                metadata: {
                  intent,
                  window,
                  note,
                },
              });
              setTicketPreview(ticket);
              form.reset();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Routing adjustment
              </label>
              <Select
                name="intent"
                placeholder="Select adjustment"
                options={[
                  { value: "Rebalance call routing between teams", label: "Rebalance call routing between teams" },
                  { value: "Temporarily divert to overflow desk", label: "Temporarily divert to overflow desk" },
                  { value: "Hold voicemail and capture details", label: "Hold voicemail and capture details" },
                  { value: "Other (add details below)", label: "Other (add details below)" },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Impact window
                </label>
                <Select
                  name="window"
                  defaultValue="Next 4 hours"
                  options={[
                    { value: "Now - 2 hours", label: "Now - 2 hours" },
                    { value: "Next 4 hours", label: "Next 4 hours" },
                    { value: "Rest of today", label: "Rest of today" },
                    { value: "Tomorrow morning", label: "Tomorrow morning" },
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Assign to
                </label>
                <Select
                  name="owner"
                  defaultValue=""
                  options={[
                    { value: "", label: "Auto-assign (ops desk)" },
                    ...ownerOptions.map((owner) => ({ value: owner, label: owner })),
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Notes for ops
              </label>
              <textarea
                name="note"
                rows={3}
                placeholder="Share any context for the operations team…"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setActiveModal(null);
                  setTicketPreview(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Queue adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={activeModal === "escalation"}
        onClose={() => {
          setActiveModal(null);
          setTicketPreview(null);
        }}
        title="Escalate flagged call"
      >
        {ticketPreview && activeModal === "escalation" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              Escalation logged — ops will follow the simulated trail below.
            </div>
            <OperationTicketPreview ticket={ticketPreview} />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  setTicketPreview(null);
                }}
              >
                Escalate another call
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setActiveModal(null);
                  setTicketPreview(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const conversationId = String(formData.get("conversation") ?? "");
              const owner = String(formData.get("owner") ?? "");
              const deadline = String(formData.get("deadline") ?? defaultSnoozeUntil);
              const note = String(formData.get("note") ?? "").trim();
              const conversation = flaggedConversations.find((item) => item.id.toString() === conversationId);
              const ticket = queueTicket({
                source: "receptionist",
                subject: `Escalation • ${conversation?.contact ?? "Flagged call"}`,
                summary: `${conversation?.summary ?? "Follow-up requested"}. SLA target ${new Date(deadline).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. ${note || "Ops to triage with on-call manager."}`,
                priority: "urgent",
                ownerHint: owner,
                metadata: {
                  conversationId,
                  owner,
                  deadline,
                  note,
                },
              });
              setTicketPreview(ticket);
              form.reset();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Flagged call
              </label>
              <Select
                name="conversation"
                defaultValue=""
                required
                placeholder="Select a conversation"
                options={[
                  { value: "", label: "Select a conversation", disabled: true },
                  ...flaggedConversations.map((conversation) => ({
                    value: String(conversation.id),
                    label: `${conversation.contact} • ${conversation.summary}`,
                  })),
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Assign to
                </label>
                <Select
                  name="owner"
                  defaultValue=""
                  options={[
                    { value: "", label: "Auto-assign (ops desk)" },
                    ...ownerOptions.map((owner) => ({ value: owner, label: owner })),
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Solve by
                </label>
                <input
                  name="deadline"
                  type="datetime-local"
                  defaultValue={defaultSnoozeUntil}
                  className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Notes for escalation
              </label>
              <textarea
                name="note"
                rows={3}
                placeholder="Share what the caller needs and any promised follow-up…"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setActiveModal(null);
                  setTicketPreview(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Queue escalation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={activeModal === "suggestion"}
        onClose={() => {
          setActiveModal(null);
          setReplySuggestion(null);
        }}
        title={replySuggestion ? `AI reply for ${replySuggestion.contact}` : "AI reply suggestion"}
      >
        {replySuggestion ? (
          <div className="space-y-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
            <p>{replySuggestion.body}</p>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(replySuggestion.body);
                  }
                }}
                className="flex-1"
              >
                Copy to clipboard
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setActiveModal(null);
                  setReplySuggestion(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            No suggestion available.
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "ticket"}
        onClose={() => {
          setActiveModal(null);
          setTicketPreview(null);
        }}
        title={ticketModalTitle}
      >
        {ticketPreview ? (
          <div className="space-y-4">
            <OperationTicketPreview ticket={ticketPreview} />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  setActiveModal(null);
                  setTicketPreview(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            Ticket queued.
          </div>
        )}
      </Modal>
    </>
  );
}
