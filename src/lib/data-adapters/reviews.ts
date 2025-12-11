"use server";

import { promises as fs } from "fs";
import path from "path";
import type { FollowUpContact } from "@/lib/dashboard-data";
import type { OperationTicket } from "@/context/OperationsContext";

export type ReviewsSnapshot = {
  followUps: FollowUpContact[];
  tickets: OperationTicket[];
};

const DATA_ROOT = path.join(process.cwd(), "tmp", "assistant-data");
const REVIEWS_PATH = path.join(DATA_ROOT, "reviews.json");

async function ensureDataRoot() {
  try {
    await fs.mkdir(DATA_ROOT, { recursive: true });
  } catch {
    // ignore
  }
}

export async function loadReviewsSnapshot(): Promise<ReviewsSnapshot> {
  await ensureDataRoot();
  try {
    const content = await fs.readFile(REVIEWS_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return {
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
    };
  } catch {
    return {
      followUps: [],
      tickets: [],
    };
  }
}

export async function persistReviewsSnapshot(snapshot: ReviewsSnapshot) {
  await ensureDataRoot();
  await fs.writeFile(REVIEWS_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

