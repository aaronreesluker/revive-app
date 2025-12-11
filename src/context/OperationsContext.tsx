"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  baselineFollowUps,
  dashboardFollowUpKey,
  loadFollowUps,
  type FollowUpActivity,
  type FollowUpContact,
  type FollowUpStatus,
} from "@/lib/dashboard-data";
import { ContextErrorBoundary } from "@/components/ContextBoundary";
import { useEventLog } from "./EventLogContext";

type OperationTicketSource = "reviews" | "receptionist" | "workflows" | "insights";
export type OperationTicketStatus = "queued" | "acknowledged" | "in_progress" | "snoozed" | "completed";

export type OperationTicketActivity = {
  id: string;
  createdAt: string;
  summary: string;
  actor: string;
  status: OperationTicketStatus;
  note?: string;
};

export type OperationTicket = {
  id: string;
  source: OperationTicketSource;
  subject: string;
  summary: string;
  priority: "low" | "normal" | "high" | "urgent";
  owner: string;
  status: OperationTicketStatus;
  createdAt: string;
  updatedAt: string;
  activities: OperationTicketActivity[];
  metadata?: Record<string, unknown>;
};

type QueueTicketPayload = {
  source: OperationTicketSource;
  subject: string;
  summary: string;
  priority?: OperationTicket["priority"];
  ownerHint?: string;
  metadata?: Record<string, unknown>;
};

type OperationsContextValue = {
  tickets: OperationTicket[];
  queueTicket: (payload: QueueTicketPayload) => OperationTicket;
  followUps: FollowUpContact[];
  assignFollowUp: (id: string, owner: string, note?: string) => void;
  snoozeFollowUp: (id: string, untilIso: string, note?: string) => void;
  completeFollowUp: (id: string, note?: string) => void;
  resetOperations: () => void;
  storageError: string | null;
};

const OperationsContext = createContext<OperationsContextValue | undefined>(undefined);

const TICKET_STORAGE_KEY = "revive-operations-tickets";
const OPERATIONS_CAP = 40;

const opsOwners = ["Alice Shaw", "Ethan Miller", "Priya Kendre", "Jordan Blake"];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadStoredTickets(): { tickets: OperationTicket[]; error: string | null } {
  if (typeof window === "undefined") return { tickets: [], error: null };
  try {
    const raw = window.localStorage.getItem(TICKET_STORAGE_KEY);
    if (!raw) return { tickets: [], error: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { tickets: [], error: null };
    const tickets = parsed
      .map((item) => ({
        ...item,
        id: item.id ?? createId("ops"),
        subject: item.subject ?? "Operations request",
        summary: item.summary ?? "",
        priority: item.priority ?? "normal",
        owner: item.owner ?? opsOwners[0],
        status: (item.status ?? "queued") as OperationTicketStatus,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
        activities: Array.isArray(item.activities)
          ? item.activities.map((activity: OperationTicketActivity) => ({
              ...activity,
              id: activity.id ?? createId("ops-activity"),
              createdAt: typeof activity.createdAt === "string" ? activity.createdAt : new Date().toISOString(),
              actor: activity.actor ?? "Operations",
              status: (activity.status ?? item.status ?? "queued") as OperationTicketStatus,
            }))
          : [],
      }))
      .slice(0, OPERATIONS_CAP);
    return { tickets, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load operations queue";
    return { tickets: [], error: message };
  }
}

function persistTickets(tickets: OperationTicket[]) {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(tickets));
    return true;
  } catch {
    return false;
  }
}

function persistFollowUpsSafe(next: FollowUpContact[]) {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(dashboardFollowUpKey, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function formatStatusSummary(status: FollowUpStatus | OperationTicketStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "acknowledged":
      return "Acknowledged";
    case "in_progress":
      return "In progress";
    case "snoozed":
      return "Snoozed";
    case "completed":
      return "Completed";
    default:
      return "Open";
  }
}

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const { recordEvent } = useEventLog();
  const initialTickets = useRef(loadStoredTickets());
  const [tickets, setTickets] = useState<OperationTicket[]>(initialTickets.current.tickets);
  const [followUps, setFollowUps] = useState<FollowUpContact[]>(() => loadFollowUps());
  const [storageError, setStorageError] = useState<string | null>(initialTickets.current.error);

  useEffect(() => {
    const ok = persistTickets(tickets);
    setStorageError(ok ? null : "Unable to persist operations queue. Refreshing may reset recent requests.");
  }, [tickets]);

  const updateFollowUps = useCallback(
    (updater: (current: FollowUpContact[]) => FollowUpContact[]) => {
      setFollowUps((prev) => {
        const next = updater(prev);
        const ok = persistFollowUpsSafe(next);
        if (!ok) {
          setStorageError("Unable to persist follow-up changes. Refreshing may reset recent updates.");
        } else if (!storageError) {
          setStorageError(null);
        }
        return next;
      });
    },
    [storageError]
  );

  const queueTicket = useCallback(
    (payload: QueueTicketPayload): OperationTicket => {
      const owner =
        payload.ownerHint && payload.ownerHint.trim()
          ? payload.ownerHint.trim()
          : opsOwners[Math.floor(Math.random() * opsOwners.length)];
      const now = Date.now();
      const id = createId("ops");
      const baseActivity: OperationTicketActivity[] = [
        {
          id: createId("ops-activity"),
          createdAt: new Date(now).toISOString(),
          summary: "Request submitted from Revive workspace",
          actor: "Revive Portal",
          status: "queued",
        },
        {
          id: createId("ops-activity"),
          createdAt: new Date(now + 5 * 60000).toISOString(),
          summary: `Ticket acknowledged by ${owner}`,
          actor: owner,
          status: "acknowledged",
        },
        {
          id: createId("ops-activity"),
          createdAt: new Date(now + 25 * 60000).toISOString(),
          summary: "Playbook draft underway — ops team assembling assets",
          actor: owner,
          status: "in_progress",
        },
      ];

      const ticket: OperationTicket = {
        id,
        source: payload.source,
        subject: payload.subject,
        summary: payload.summary,
        priority: payload.priority ?? "normal",
        owner,
        status: "in_progress",
        createdAt: new Date(now).toISOString(),
        updatedAt: baseActivity[baseActivity.length - 1].createdAt,
        activities: baseActivity,
        metadata: payload.metadata ?? {},
      };

      setTickets((prev) => {
        const next = [ticket, ...prev].slice(0, OPERATIONS_CAP);
        return next;
      });

      recordEvent({
        category: "operations",
        action: "ticket_created",
        severity: "info",
        summary: `${formatStatusSummary(ticket.status)} ticket • ${payload.subject}`,
        meta: {
          source: payload.source,
          priority: ticket.priority,
          owner,
        },
      });

      return ticket;
    },
    [recordEvent]
  );

  const assignFollowUp = useCallback(
    (id: string, owner: string, note?: string) => {
      const timestamp = new Date().toISOString();
      updateFollowUps((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          const activity: FollowUpActivity = {
            id: createId("followup-activity"),
            createdAt: timestamp,
            summary: `Assigned to ${owner}`,
            actor: owner,
            status: "in_progress",
            note,
          };
          return {
            ...item,
            status: "in_progress",
            assignedTo: owner,
            activities: [activity, ...item.activities],
          };
        })
      );

      recordEvent({
        category: "operations",
        action: "followup_assigned",
        severity: "info",
        summary: `Follow-up assigned to ${owner}`,
        meta: { followUpId: id, note },
      });
    },
    [recordEvent, updateFollowUps]
  );

  const snoozeFollowUp = useCallback(
    (id: string, untilIso: string, note?: string) => {
      const timestamp = new Date().toISOString();
      updateFollowUps((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          const activity: FollowUpActivity = {
            id: createId("followup-activity"),
            createdAt: timestamp,
            summary: `Snoozed until ${new Date(untilIso).toLocaleString("en-GB")}`,
            actor: item.assignedTo ?? "Automation",
            status: "snoozed",
            note,
          };
          return {
            ...item,
            status: "snoozed",
            snoozedUntil: untilIso,
            activities: [activity, ...item.activities],
          };
        })
      );

      recordEvent({
        category: "operations",
        action: "followup_snoozed",
        severity: "warning",
        summary: "Follow-up snoozed",
        meta: { followUpId: id, until: untilIso, note },
      });
    },
    [recordEvent, updateFollowUps]
  );

  const completeFollowUp = useCallback(
    (id: string, note?: string) => {
      const timestamp = new Date().toISOString();
      updateFollowUps((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          const activity: FollowUpActivity = {
            id: createId("followup-activity"),
            createdAt: timestamp,
            summary: "Marked as completed",
            actor: item.assignedTo ?? "Automation",
            status: "completed",
            note,
          };
          return {
            ...item,
            status: "completed",
            lastTouchpoint: timestamp,
            activities: [activity, ...item.activities],
          };
        })
      );

      recordEvent({
        category: "operations",
        action: "followup_completed",
        severity: "info",
        summary: "Follow-up completed",
        meta: { followUpId: id, note },
      });
    },
    [recordEvent, updateFollowUps]
  );

  const resetOperations = useCallback(() => {
    setTickets([]);
    setFollowUps(() => baselineFollowUps.map((item) => ({ ...item, activities: [...item.activities] })));
    persistTickets([]);
    persistFollowUpsSafe(baselineFollowUps);
    recordEvent({
      category: "operations",
      action: "reset_demo_operations",
      severity: "info",
      summary: "Operations queue reset",
    });
  }, [recordEvent]);

  const value = useMemo<OperationsContextValue>(
    () => ({
      tickets,
      queueTicket,
      followUps,
      assignFollowUp,
      snoozeFollowUp,
      completeFollowUp,
      resetOperations,
      storageError,
    }),
    [tickets, queueTicket, followUps, assignFollowUp, snoozeFollowUp, completeFollowUp, resetOperations, storageError]
  );

  return (
    <ContextErrorBoundary name="OperationsContext" onReset={resetOperations}>
      <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error("useOperations must be used within an OperationsProvider");
  }
  return context;
}

