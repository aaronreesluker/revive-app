"use server";

import { promises as fs } from "fs";
import path from "path";
import type { StripeInvoice } from "@/lib/stripe-types";

type PaymentRequestRecord = {
  id: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  link: string;
  createdAt: string;
  billingType: "one_time" | "recurring";
  billingInterval?: "weekly" | "monthly" | "quarterly" | "yearly";
  fallback?: boolean;
};

export type PaymentsSnapshot = {
  invoices: StripeInvoice[];
  requests: PaymentRequestRecord[];
};

const DATA_ROOT = path.join(process.cwd(), "tmp", "assistant-data");
const PAYMENTS_PATH = path.join(DATA_ROOT, "payments.json");

async function ensureDataRoot() {
  try {
    await fs.mkdir(DATA_ROOT, { recursive: true });
  } catch {
    // ignore
  }
}

export async function loadPaymentsSnapshot(): Promise<PaymentsSnapshot> {
  await ensureDataRoot();
  try {
    const content = await fs.readFile(PAYMENTS_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return {
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      requests: Array.isArray(parsed.requests ?? parsed.paymentRequests) ? parsed.requests ?? parsed.paymentRequests : [],
    };
  } catch {
    return {
      invoices: [],
      requests: [],
    };
  }
}

export async function persistPaymentsSnapshot(snapshot: PaymentsSnapshot) {
  await ensureDataRoot();
  await fs.writeFile(PAYMENTS_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

