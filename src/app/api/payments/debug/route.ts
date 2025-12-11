/**
 * API Route: GET /api/payments/debug
 * Debug endpoint to see what the payments API is returning
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getStripeInvoices } = await import("@/lib/stripe");
    const invoices = await getStripeInvoices(50);
    
    return NextResponse.json({
      success: true,
      source: "stripe",
      invoiceCount: invoices.length,
      invoices: invoices.slice(0, 5), // Show first 5 for debugging
      message: invoices.length === 0 
        ? "Stripe connection is working, but you have no invoices in your Stripe account yet."
        : `Successfully fetched ${invoices.length} invoices from Stripe.`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      source: "error",
      error: error.message,
      code: error.code,
      type: error.type,
      message: "Failed to fetch invoices from Stripe.",
    }, { status: 500 });
  }
}

