/**
 * API Route: GET /api/payments
 * Fetch payments/invoices from Stripe
 * This is a SERVER-ONLY route
 */

import { NextResponse } from "next/server";
import { loadFallbackInvoices } from "@/lib/dashboard-data";

export async function GET(request: Request) {
  try {
    // Get tenant ID and connected account ID from request (in production, get from auth session)
    const tenantId = request.headers.get("x-tenant-id") || "demo-agency";
    const connectedAccountId = request.headers.get("x-stripe-account-id"); // Client passes this if connected
    
    // Try to use Stripe Connect if connected account ID provided
    if (connectedAccountId) {
      try {
        const stripeConnect = await import("@/lib/stripe-connect");
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "10");
        
        const invoices = await stripeConnect.getInvoicesForConnectedAccount(connectedAccountId, limit);
        
        return NextResponse.json({ invoices, source: "stripe_connect" });
      } catch (connectError) {
        console.error("Error with Stripe Connect:", connectError);
        // Fall through to regular Stripe or fallback
      }
    }
    
    // Fallback to regular Stripe if no connected account
    const { getStripeInvoices } = await import("@/lib/stripe");
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const invoices = await getStripeInvoices(limit);

    return NextResponse.json({ invoices, source: "stripe" });
  } catch (error) {
    console.error("Error fetching payments:", error);
    const fallback = loadFallbackInvoices();
    let safeLimit = fallback.length;
    try {
      const url = new URL(request.url);
      const limitParam = Number.parseInt(url.searchParams.get("limit") || "10", 10);
      if (Number.isFinite(limitParam) && limitParam > 0) {
        safeLimit = limitParam;
      }
    } catch {
      // ignore malformed URL/limit parsing issues
    }
    const slicedFallback = fallback.slice(0, Math.max(0, safeLimit));

    // Provide helpful error messages for common Stripe errors
    let errorMessage = "Stripe is not available; returning fallback payments.";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for expired/invalid key errors
      if (error.message.includes("Expired API Key") || error.message.includes("api_key_expired")) {
        const secretKey = process.env.STRIPE_SECRET_KEY || "";
        const isLiveKey = secretKey.startsWith("sk_live_");
        const isTestKey = secretKey.startsWith("sk_test_");
        
        if (isLiveKey) {
          errorMessage = "Your Stripe Live key appears to be expired or invalid. For development, use Test mode keys (sk_test_...). Go to Stripe Dashboard → Developers → API keys and toggle to Test mode, then copy your Test secret key.";
        } else if (isTestKey) {
          errorMessage = "Your Stripe Test key appears to be expired or invalid. Go to Stripe Dashboard → Developers → API keys, make sure you're in Test mode, and create a new secret key if needed.";
        } else {
          errorMessage = "Your Stripe API key appears to be expired or invalid. Please check your STRIPE_SECRET_KEY in .env.local and ensure it's a valid key from your Stripe Dashboard.";
        }
      } else if (error.message.includes("Invalid API Key") || error.message.includes("api_key_invalid")) {
        errorMessage = "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local. Make sure you're using the Secret key (sk_test_... or sk_live_...), not the Publishable key.";
      }
    }

    return NextResponse.json(
      {
        invoices: slicedFallback,
        source: "fallback",
        error: errorMessage,
      },
      { status: 200 }
    );
  }
}

