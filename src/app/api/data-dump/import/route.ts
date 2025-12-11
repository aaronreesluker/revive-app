"use server";

import { NextResponse } from "next/server";
import { persistTokensSnapshot } from "@/lib/data-adapters/tokens";
import { persistPaymentsSnapshot } from "@/lib/data-adapters/payments";
import { persistReviewsSnapshot } from "@/lib/data-adapters/reviews";

type ImportPayload =
  | { type: "tokens"; payload: unknown }
  | { type: "payments"; payload: unknown }
  | { type: "reviews"; payload: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportPayload;
    switch (body.type) {
      case "tokens": {
        await persistTokensSnapshot((body.payload ?? {}) as any);
        break;
      }
      case "payments": {
        await persistPaymentsSnapshot((body.payload ?? {}) as any);
        break;
      }
      case "reviews": {
        await persistReviewsSnapshot((body.payload ?? {}) as any);
        break;
      }
      default:
        return NextResponse.json({ error: "Unsupported import type" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to persist data dump import", error);
    return NextResponse.json({ error: "Unable to persist dataset" }, { status: 500 });
  }
}

