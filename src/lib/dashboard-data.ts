import type { StripeInvoice } from "./stripe-types";

export type FollowUpStatus = "open" | "in_progress" | "snoozed" | "completed";

export type FollowUpActivity = {
  id: string;
  createdAt: string;
  summary: string;
  actor: string;
  status?: FollowUpStatus;
  note?: string;
};

export type FollowUpContact = {
  id: string;
  contactName: string;
  company?: string;
  annualValueGBP: number;
  lastTouchpoint: string; // ISO string
  importance: "high" | "medium" | "low";
  reason: "idle" | "missed_call" | "invoice" | "custom";
  status: FollowUpStatus;
  assignedTo?: string | null;
  snoozedUntil?: string | null;
  activities: FollowUpActivity[];
};

export const dashboardFollowUpKey = "revive-dashboard-followups";

function createBaselineFollowUp(partial: Omit<FollowUpContact, "status" | "assignedTo" | "snoozedUntil" | "activities">): FollowUpContact {
  return {
    ...partial,
    status: "open",
    assignedTo: null,
    snoozedUntil: null,
    activities: [
      {
        id: `${partial.id}-created`,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        summary: "Flagged by Revive insights",
        actor: "Automation",
        status: "open",
      },
    ],
  };
}

export const baselineFollowUps: FollowUpContact[] = [
  createBaselineFollowUp({
    id: "followup-1",
    contactName: "Ava Patel",
    company: "Patel & Co. Clinics",
    annualValueGBP: 42000,
    lastTouchpoint: new Date(Date.now() - 52 * 86400000).toISOString(),
    importance: "high",
    reason: "idle",
  }),
  createBaselineFollowUp({
    id: "followup-2",
    contactName: "James Whitmore",
    company: "Whitmore Legal",
    annualValueGBP: 36000,
    lastTouchpoint: new Date(Date.now() - 38 * 86400000).toISOString(),
    importance: "medium",
    reason: "missed_call",
  }),
  createBaselineFollowUp({
    id: "followup-3",
    contactName: "Maya Chen",
    company: "Chen Aesthetics",
    annualValueGBP: 54000,
    lastTouchpoint: new Date(Date.now() - 66 * 86400000).toISOString(),
    importance: "high",
    reason: "idle",
  }),
  createBaselineFollowUp({
    id: "followup-4",
    contactName: "Lucas Owens",
    company: "Owens Fitness Collective",
    annualValueGBP: 18500,
    lastTouchpoint: new Date(Date.now() - 21 * 86400000).toISOString(),
    importance: "medium",
    reason: "missed_call",
  }),
  createBaselineFollowUp({
    id: "followup-5",
    contactName: "Sophie Elkington",
    company: "The Elkington Group",
    annualValueGBP: 61000,
    lastTouchpoint: new Date(Date.now() - 94 * 86400000).toISOString(),
    importance: "high",
    reason: "idle",
  }),
];

const baselineInvoices: StripeInvoice[] = [
  {
    id: "test-inv-1001",
    invoiceNumber: "INV-1001",
    customerName: "Harrington Design",
    customerEmail: "accounts@harringtondesign.co.uk",
    amount: 1250,
    status: "open",
    dueDate: Math.floor((Date.now() - 7 * 86400000) / 1000),
    created: Math.floor((Date.now() - 24 * 86400000) / 1000),
    hostedInvoiceUrl: null,
    invoicePdf: null,
  },
  {
    id: "test-inv-1002",
    invoiceNumber: "INV-1002",
    customerName: "Lumen Wellness",
    customerEmail: "billing@lumenwellness.com",
    amount: 890,
    status: "open",
    dueDate: Math.floor((Date.now() - 3 * 86400000) / 1000),
    created: Math.floor((Date.now() - 15 * 86400000) / 1000),
    hostedInvoiceUrl: null,
    invoicePdf: null,
  },
  {
    id: "test-inv-1003",
    invoiceNumber: "INV-1003",
    customerName: "Elliot & Straus",
    customerEmail: "finance@elliotstraus.com",
    amount: 1780,
    status: "open",
    dueDate: Math.floor((Date.now() + 5 * 86400000) / 1000),
    created: Math.floor((Date.now() - 8 * 86400000) / 1000),
    hostedInvoiceUrl: null,
    invoicePdf: null,
  },
  {
    id: "test-inv-1004",
    invoiceNumber: "INV-1004",
    customerName: "The Nova Group",
    customerEmail: "payables@novagroup.io",
    amount: 3100,
    status: "paid",
    dueDate: Math.floor((Date.now() - 19 * 86400000) / 1000),
    created: Math.floor((Date.now() - 35 * 86400000) / 1000),
    hostedInvoiceUrl: null,
    invoicePdf: null,
  },
];

export function loadFallbackInvoices(): StripeInvoice[] {
  return baselineInvoices;
}

export function loadFollowUps(): FollowUpContact[] {
  if (typeof window === "undefined") return baselineFollowUps;
  try {
    const raw = window.localStorage.getItem(dashboardFollowUpKey);
    if (!raw) {
      window.localStorage.setItem(dashboardFollowUpKey, JSON.stringify(baselineFollowUps));
      return baselineFollowUps;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return baselineFollowUps;
    return parsed.map((item) => ({
      ...item,
      status: (item.status ?? "open") as FollowUpStatus,
      assignedTo: item.assignedTo ?? null,
      snoozedUntil: item.snoozedUntil ?? null,
      activities: Array.isArray(item.activities)
        ? item.activities.map((activity: any) => ({
            ...activity,
            id: activity.id ?? `${item.id}-activity-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: typeof activity.createdAt === "string" ? activity.createdAt : new Date().toISOString(),
            actor: activity.actor ?? "Automation",
            summary: activity.summary ?? "Status update",
            status: activity.status ?? item.status ?? "open",
          }))
        : [],
      lastTouchpoint: typeof item.lastTouchpoint === "string" ? item.lastTouchpoint : new Date().toISOString(),
    })) satisfies FollowUpContact[];
  } catch {
    return baselineFollowUps;
  }
}

export function persistFollowUps(next: FollowUpContact[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dashboardFollowUpKey, JSON.stringify(next));
  } catch {
    // ignore persistence issues
  }
}

export function daysSince(dateIso: string) {
  const timestamp = Date.parse(dateIso);
  if (Number.isNaN(timestamp)) return Infinity;
  return Math.floor((Date.now() - timestamp) / 86400000);
}
