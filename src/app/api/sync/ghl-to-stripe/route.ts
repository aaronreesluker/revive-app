/**
 * API Route: POST /api/sync/ghl-to-stripe
 * Manually sync GHL contacts to Stripe customers
 */

import { NextResponse } from "next/server";
import { syncGhlContactsToStripe } from "@/lib/sync/ghl-stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const locationId = body.locationId || process.env.REVIVE_GHL_LOCATION_ID;

    const result = await syncGhlContactsToStripe(locationId);

    return NextResponse.json({
      success: result.success,
      synced: result.synced,
      errors: result.errors,
      message: result.success
        ? `Successfully synced ${result.synced} contacts from GHL to Stripe`
        : `Failed to sync: ${result.errors.join(", ")}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

