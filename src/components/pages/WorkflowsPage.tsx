"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { useTier } from "../../context/TierContext";
import { useLearning } from "../../context/LearningContext";
import {
  TIER_SEQUENCE,
  tierMeta,
  tierOrder,
  getNextTier,
  isTierOrHigher,
} from "../../lib/tiers";
import { cn } from "../../lib/utils";
import {
  Plus,
  Settings,
  Phone,
  MessageSquare,
  Clock,
  PoundSterling,
  Star,
  HelpCircle,
  BarChart3,
  Users,
  FileText,
  Sparkles,
  Power,
  Lock,
  CheckCircle,
} from "lucide-react";
import { useOperations, type OperationTicket } from "../../context/OperationsContext";
import { OperationTicketPreview } from "../operations/OperationTicketPreview";
import { Select } from "../Select";
import { useCurrentPlan } from "@/hooks/usePlanFeatures";

type Automation = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tier: "lite" | "core" | "growth";
  active: boolean;
  isBespoke?: boolean;
};

const automations: Automation[] = [
  {
    id: "ai-receptionist",
    name: "AI Receptionist",
    description: "Takes calls, sets meetings, handles inquiries 24/7",
    icon: <Phone size={20} />,
    tier: "core",
    active: true,
  },
  {
    id: "5min-reachout",
    name: "5-Minute Message Reach Out",
    description: "Semi-automated instant response to new leads within 5 minutes",
    icon: <MessageSquare size={20} />,
    tier: "core",
    active: true,
  },
  {
    id: "no-show-prevention",
    name: "No-Show Prevention Flow",
    description: "Predictive reminders + automatic rescheduling if missed",
    icon: <Clock size={20} />,
    tier: "core",
    active: true,
  },
  {
    id: "lead-reengagement",
    name: "Lead Re-Engagement",
    description: "Identifies and follows up with leads inactive >30 days",
    icon: <Users size={20} />,
    tier: "core",
    active: false,
  },
  {
    id: "payment-recovery",
    name: "Missed Payment Recovery",
    description: "Automatic reminders for failed or overdue payments",
    icon: <PoundSterling size={20} />,
    tier: "core",
    active: true,
  },
  {
    id: "review-referral",
    name: "Review-to-Referral Flow",
    description: "Positive review → AI triggers thank-you message with referral link",
    icon: <Star size={20} />,
    tier: "core",
    active: true,
  },
  {
    id: "ai-faq",
    name: "AI FAQ / Knowledge Agent",
    description: "Answers client questions 24/7 based on docs, reviews, and CRM data",
    icon: <HelpCircle size={20} />,
    tier: "growth",
    active: false,
  },
  {
    id: "kpi-briefing",
    name: "AI KPI Briefing Agent",
    description: "Weekly summary email: 'Here's how your automations performed this week'",
    icon: <BarChart3 size={20} />,
    tier: "growth",
    active: true,
  },
  {
    id: "sales-assistant",
    name: "AI Sales/Follow-Up Assistant",
    description: "Contextual WhatsApp/SMS messaging to rewarm cold leads",
    icon: <MessageSquare size={20} />,
    tier: "growth",
    active: false,
  },
  {
    id: "meeting-notes",
    name: "AI Meeting Note Agent",
    description: "Summarizes Zoom/Google Meet recordings → creates tasks in GHL",
    icon: <FileText size={20} />,
    tier: "growth",
    active: false,
  },
  {
    id: "insights-tab",
    name: "Portal Insights Tab",
    description: "AI-generated recommendations, trend visualizations, and agent controls",
    icon: <Sparkles size={20} />,
    tier: "growth",
    active: true,
  },
  {
    id: "bespoke-automation",
    name: "Bespoke Automation",
    description: "Request a tailored automation unique to your processes and systems",
    icon: <Power size={20} />,
    tier: "growth",
    active: false,
    isBespoke: true,
  },
];

export function WorkflowsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [configWorkflow, setConfigWorkflow] = useState<string | null>(null);
  const [automationStates, setAutomationStates] = useState<Record<string, boolean>>(
    Object.fromEntries(automations.map((a) => [a.id, a.active]))
  );
  const [createTicketResult, setCreateTicketResult] = useState<OperationTicket | null>(null);
  const [configTicketResult, setConfigTicketResult] = useState<OperationTicket | null>(null);
  const { tier, setTier } = useTier();
  const router = useRouter();
  const { queueTicket } = useOperations();
  const { features } = useCurrentPlan();
  const { recordEvent } = useLearning();

  const currentTierIndex = tierOrder[tier];
  const nextTier = getNextTier(tier);

  const orderedTiers = useMemo(() => {
    const current = tierOrder[tier];
    const lower = TIER_SEQUENCE.filter((plan) => tierOrder[plan] < current).sort(
      (a, b) => tierOrder[b] - tierOrder[a]
    );
    const higher = TIER_SEQUENCE.filter((plan) => tierOrder[plan] > current).sort(
      (a, b) => tierOrder[a] - tierOrder[b]
    );
    return [tier, ...lower, ...higher].filter((plan, index, self) => self.indexOf(plan) === index);
  }, [tier]);

  const tiers = orderedTiers.map((key) => ({
    key,
    name: tierMeta[key].label,
    color: tierMeta[key].color,
  }));

  const toggleAutomation = (id: string) => {
    const wasActive = automationStates[id];
    const automation = automations.find((a) => a.id === id);
    setAutomationStates((prev) => ({ ...prev, [id]: !prev[id] }));
    
    // Record learning event
    recordEvent({
      type: wasActive ? "workflow_failed" : "workflow_activated",
      metadata: {
        workflowId: id,
        action: wasActive ? "deactivated" : "activated",
        category: automation?.tier || "unknown",
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            AI Automation Agents
          </h2>
          <p className="mt-1 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            Automate your workflows and streamline operations
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateTicketResult(null);
            setShowCreateModal(true);
          }}
        >
          <Plus size={14} className="mr-1" />
          Request New Automation
        </Button>
      </div>

      {/* Tier/plan selection UI removed */}

      {tiers.map((tierGroup) => {
        const tierAutomations = automations.filter((a) => a.tier === tierGroup.key);
        return (
          <div key={tierGroup.key} className="space-y-3">
            <h3 className={`text-lg font-semibold ${tierGroup.color}`}>{tierGroup.name} Tier</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {tierAutomations.map((automation) => {
                const isAutomationAvailable = isTierOrHigher(tier, automation.tier);
                // Gate advanced workflows based on plan features
                const requiresAdvancedWorkflows = automation.isBespoke || ["ai-faq", "kpi-briefing", "sales-assistant", "bespoke-automation"].includes(automation.id);
                const hasAdvancedAccess = features.advancedWorkflows || !requiresAdvancedWorkflows;
                const isActive = automationStates[automation.id];
                const cardClass = cn(
                  "card-glass relative overflow-hidden rounded-xl p-5 transition-all",
                  !isAutomationAvailable && "border-dashed border-white/20 bg-white/5"
                );

                return (
                  <div key={automation.id} className={cardClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="brand-text mt-0.5">{automation.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold" style={{ color: "var(--foreground)" }}>
                            {automation.name}
                          </h4>
                          <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                            {automation.description}
                          </p>
                          {isAutomationAvailable ? (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium" style={{ color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                              <CheckCircle size={12} />
                              Unlocked in {tierMeta[automation.tier].label}
                            </div>
                          ) : (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)", border: "1px solid color-mix(in oklab, var(--ring), transparent 50%)" }}>
                              <Lock size={12} />
                              {tierMeta[automation.tier].label} feature
                            </div>
                          )}
                          {!hasAdvancedAccess && requiresAdvancedWorkflows && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium" style={{ color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                              <Lock size={12} />
                              Requires Growth plan
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAutomationAvailable && hasAdvancedAccess ? (
                      automation.isBespoke ? (
                        <div className="flex justify-end border-t app-ring pt-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setConfigTicketResult(null);
                              setConfigWorkflow(automation.name);
                            }}
                          >
                            <Settings size={12} className="mr-1" />
                            Request Automation
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 border-t app-ring pt-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleAutomation(automation.id);
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-transparent ${
                                isActive ? "bg-teal-600" : "bg-zinc-700"
                              }`}
                              aria-label={isActive ? "Deactivate automation" : "Activate automation"}
                              aria-pressed={isActive}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                  isActive ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                            <span className="text-xs md:text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                              {isActive ? "Active" : "Paused"}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setConfigTicketResult(null);
                              setConfigWorkflow(automation.name);
                            }}
                          >
                            <Settings size={12} className="mr-1" />
                            Configure
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="border-t app-ring pt-3">
                        <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                          This automation is available. Configure it to get started.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setConfigTicketResult(null);
                              setConfigWorkflow(automation.name);
                            }}
                          >
                            <Settings size={12} className="mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
      </div>
          </div>
        );
      })}

      {/* Request New Automation Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateTicketResult(null);
        }}
        title="Request New Automation"
      >
        {createTicketResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              We queued your request with the operations desk. Track the simulated timeline below — future status updates will hydrate automatically in this preview.
            </div>
            <OperationTicketPreview ticket={createTicketResult} />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  setCreateTicketResult(null);
                }}
              >
                Queue another automation
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateTicketResult(null);
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
              const name = String(formData.get("automationName") ?? "").trim() || "Automation request";
              const trigger = String(formData.get("trigger") ?? "New Lead Captured");
              const action = String(formData.get("action") ?? "Send SMS");
              const details = String(formData.get("details") ?? "").trim();
              const priorityValue = (formData.get("priority") as string) || "normal";
              const ticket = queueTicket({
                source: "workflows",
                subject: name,
                summary: `${trigger} → ${action}. ${details || "No additional context provided."}`,
                priority: priorityValue as OperationTicket["priority"],
                metadata: {
                  trigger,
                  action,
                  details,
                },
              });
              setCreateTicketResult(ticket);
              form.reset();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Automation Name
              </label>
              <input
                name="automationName"
                type="text"
                required
                placeholder="e.g., AI Appointment Scheduler"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                What should trigger this workflow?
              </label>
              <Select
                name="trigger"
                placeholder="Choose a trigger"
                options={[
                  { value: "New Lead Captured", label: "New Lead Captured" },
                  { value: "Appointment Scheduled", label: "Appointment Scheduled" },
                  { value: "Job Completed", label: "Job Completed" },
                  { value: "Payment Received", label: "Payment Received" },
                  { value: "Other (describe below)", label: "Other (describe below)" },
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                What action should it perform?
              </label>
              <Select
                name="action"
                placeholder="Choose an action"
                options={[
                  { value: "Send SMS", label: "Send SMS" },
                  { value: "Send Email", label: "Send Email" },
                  { value: "Create Task", label: "Create Task" },
                  { value: "Request Review", label: "Request Review" },
                  { value: "Other (describe below)", label: "Other (describe below)" },
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Additional Details
              </label>
              <textarea
                name="details"
                rows={3}
                placeholder="Any specific requirements or details about this automation..."
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Priority
              </label>
              <Select
                name="priority"
                defaultValue="normal"
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Queue Request
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Automation Configuration Request Modal */}
      <Modal
        open={!!configWorkflow}
        onClose={() => {
          setConfigWorkflow(null);
          setConfigTicketResult(null);
        }}
        title="Request Automation Configuration"
      >
        {configWorkflow && (configTicketResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-sky-400/25 bg-sky-400/10 p-3 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              We logged the configuration ticket with the ops desk. Review the activity trail to follow simulated progress.
            </div>
            <OperationTicketPreview ticket={configTicketResult} />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  setConfigTicketResult(null);
                }}
              >
                Adjust another automation
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setConfigWorkflow(null);
                  setConfigTicketResult(null);
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
              const requestedChanges = String(formData.get("changes") ?? "").trim();
              const priorityValue = (formData.get("priority") as string) || "normal";
              const ticket = queueTicket({
                source: "workflows",
                subject: `Config tweak • ${configWorkflow}`,
                summary: requestedChanges || "Requested configuration update.",
                priority: priorityValue as OperationTicket["priority"],
                metadata: {
                  automation: configWorkflow,
                  requestedChanges,
                },
              });
              setConfigTicketResult(ticket);
              form.reset();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Automation
              </label>
              <input
                type="text"
                value={configWorkflow}
                readOnly
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring opacity-60"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                What would you like to change?
              </label>
              <textarea
                name="changes"
                required
                rows={4}
                placeholder="Describe the changes you'd like to make to this automation..."
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Priority
              </label>
              <Select
                name="priority"
                defaultValue="normal"
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setConfigWorkflow(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Queue Configuration Request
              </Button>
            </div>
          </form>
        ))}
      </Modal>
    </div>
  );
}

