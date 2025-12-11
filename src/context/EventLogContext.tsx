"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ContextErrorBoundary } from "@/components/ContextBoundary";

export type EventCategory =
  | "system"
  | "auth"
  | "tokens"
  | "payments"
  | "workflows"
  | "reviews"
  | "notifications"
  | "receptionist"
  | "operations";

export type EventSeverity = "info" | "warning" | "critical";

export type EventLogEntry = {
  id: string;
  category: EventCategory;
  action: string;
  summary: string;
  createdAt: string;
  severity: EventSeverity;
  meta?: Record<string, unknown>;
};

type EventLogContextValue = {
  events: EventLogEntry[];
  recordEvent: (entry: Omit<EventLogEntry, "id" | "createdAt" | "severity"> & {
    id?: string;
    createdAt?: string;
    severity?: EventSeverity;
  }) => EventLogEntry;
  clearEvents: () => void;
  resetDemoLog: () => void;
  storageError: string | null;
};

const STORAGE_KEY = "revive-event-log";
const MAX_EVENTS = 500;

const EventLogContext = createContext<EventLogContextValue | undefined>(undefined);

function createEntryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function loadStoredEvents(): { events: EventLogEntry[]; error: string | null } {
  if (typeof window === "undefined") {
    return { events: [], error: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], error: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { events: [], error: null };
    const normalised = parsed
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createEntryId("event"),
        category: (item.category ?? "system") as EventCategory,
        action: typeof item.action === "string" ? item.action : "unknown",
        summary: typeof item.summary === "string" ? item.summary : "Event summary unavailable",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        severity: (item.severity ?? "info") as EventSeverity,
        meta: typeof item.meta === "object" && item.meta !== null ? item.meta : undefined,
      })) as EventLogEntry[];
    return { events: normalised.slice(0, MAX_EVENTS), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage error";
    return { events: [], error: message };
  }
}

function persistEvents(events: EventLogEntry[]) {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

export function EventLogProvider({ children }: { children: React.ReactNode }) {
  const initialLoad = useRef(loadStoredEvents());
  const [events, setEvents] = useState<EventLogEntry[]>(initialLoad.current.events);
  const [storageError, setStorageError] = useState<string | null>(initialLoad.current.error);

  useEffect(() => {
    const ok = persistEvents(events);
    setStorageError(ok ? null : "Unable to persist event history. Activity may be missing after refresh.");
  }, [events]);

  const recordEvent = useCallback<EventLogContextValue["recordEvent"]>((entry) => {
    const finalEntry: EventLogEntry = {
      id: entry.id ?? createEntryId(entry.action ?? "event"),
      category: entry.category,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt ?? new Date().toISOString(),
      severity: entry.severity ?? "info",
      meta: entry.meta,
    };
    setEvents((prev) => [finalEntry, ...prev].slice(0, MAX_EVENTS));
    return finalEntry;
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const resetDemoLog = useCallback(() => {
    setEvents([]);
    setStorageError(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const value = useMemo<EventLogContextValue>(
    () => ({
      events,
      recordEvent,
      clearEvents,
      resetDemoLog,
      storageError,
    }),
    [events, recordEvent, clearEvents, resetDemoLog, storageError]
  );

  return (
    <ContextErrorBoundary name="EventLogContext" onReset={resetDemoLog}>
      <EventLogContext.Provider value={value}>{children}</EventLogContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useEventLog() {
  const ctx = useContext(EventLogContext);
  if (!ctx) {
    throw new Error("useEventLog must be used within an EventLogProvider");
  }
  return ctx;
}

