/**
 * API Route: GET /api/stripe-connect/oauth
 * Generate Stripe Connect OAuth URL
 */

import { NextResponse } from "next/server";
import { generateStripeConnectUrl, getStripeConnectClientId } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  try {
    // If Stripe Connect is not configured, return a friendly error instead of throwing
    try {
      getStripeConnectClientId();
    } catch {
      return NextResponse.json(
        {
          error:
            "Stripe Connect is not configured for this workspace. You can still use basic Stripe payments without connecting an account.",
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id") || "demo-agency";
    const redirectUri = searchParams.get("redirect_uri") || "/settings?stripe_connected=true";

    const oauthUrl = await generateStripeConnectUrl(tenantId, redirectUri);

    return NextResponse.json({ oauthUrl });
  } catch (error) {
    console.error("Error generating Stripe Connect OAuth URL:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate OAuth URL",
      },
      { status: 500 }
    );
  }
}

