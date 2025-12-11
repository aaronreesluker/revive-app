"use server";

import { promises as fs } from "fs";
import path from "path";

export type SalesLeadSnapshot = {
  leads: Array<{
    id: string;
    businessName: string;
    industry: string;
    phoneNumber: string;
    currentPrice: number;
    status: "Closed" | "Appointment Booked" | "Not Interested";
    priceSoldAt?: number;
    upsellAmount?: number;
    upsellDescription?: string;
    closedDate?: number;
    createdAt: number;
    updatedAt: number;
    // Additional metrics fields
    source?: string;
    salesRep?: string;
    followUpCount?: number;
    responseTime?: number;
    meetingDuration?: number;
    discount?: number;
    winReason?: string;
    lossReason?: string;
    appointmentDate?: number;
    quoteSentDate?: number;
    quoteAcceptedDate?: number;
    isRepeatCustomer?: boolean;
    companySize?: string;
    location?: string;
    notes?: string;
  }>;
};

const DATA_ROOT = path.join(process.cwd(), "tmp", "assistant-data");
const SALES_FILE = path.join(DATA_ROOT, "sales-leads.json");

async function ensureDataRoot() {
  try {
    await fs.mkdir(DATA_ROOT, { recursive: true });
  } catch {
    // ignore
  }
}

/**
 * Load sales leads snapshot from file system
 * @returns Sales leads data for AI assistant context
 */
export async function loadSalesSnapshot(): Promise<SalesLeadSnapshot> {
  await ensureDataRoot();
  try {
    const raw = await fs.readFile(SALES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
    };
  } catch {
    return { leads: [] };
  }
}

/**
 * Persist sales leads snapshot to file system
 * @param snapshot - Sales leads data to save
 */
export async function persistSalesSnapshot(snapshot: SalesLeadSnapshot): Promise<void> {
  await ensureDataRoot();
  await fs.writeFile(SALES_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

