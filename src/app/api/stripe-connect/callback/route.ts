/**
 * API Route: POST /api/stripe-connect/callback
 * Exchange OAuth code for connected account ID
 */

import { NextResponse } from "next/server";
import { exchangeStripeConnectCode } from "@/lib/stripe-connect";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, tenantId } = body;

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const account = await exchangeStripeConnectCode(code);

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        tenantId: tenantId || "demo-agency",
      },
    });
  } catch (error) {
    console.error("Error exchanging Stripe Connect code:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to connect Stripe account",
      },
      { status: 500 }
    );
  }
}

