/**
 * API Route: GET /api/stripe/test
 * Test Stripe API key connection
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = await getStripe();
    
    // Simple test: retrieve account info
    const account = await stripe.accounts.retrieve();
    
    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        type: account.type,
      },
      keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + "...",
    });
  } catch (error: any) {
    const errorDetails: any = {
      success: false,
      error: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
    };
    
    // Add key info (masked)
    if (process.env.STRIPE_SECRET_KEY) {
      const key = process.env.STRIPE_SECRET_KEY;
      errorDetails.keyInfo = {
        prefix: key.substring(0, 10),
        suffix: key.substring(key.length - 5),
        length: key.length,
        isLive: key.startsWith("sk_live_"),
        isTest: key.startsWith("sk_test_"),
      };
    } else {
      errorDetails.keyInfo = { error: "STRIPE_SECRET_KEY not found in environment" };
    }
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

