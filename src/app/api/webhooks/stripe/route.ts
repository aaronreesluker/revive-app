/**
 * API Route: POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * This is a SERVER-ONLY route
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(request: Request) {
  // Dynamically import server-only modules to avoid client-side bundling
  const { headers } = await import("next/headers");
  const { getStripe } = await import("@/lib/stripe");
  
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: any;

  try {
    const stripeInstance = await getStripe();
    event = stripeInstance.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle different event types
  switch (event.type) {
    case "invoice.payment_succeeded":
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Payment succeeded for invoice:", invoice.id);
      
      // Sync to GoHighLevel
      try {
        const { updateGhlOnPaymentSuccess } = await import("@/lib/sync/ghl-stripe");
        const syncResult = await updateGhlOnPaymentSuccess(invoice);
        if (syncResult.success) {
          console.log("✅ Synced payment success to GHL");
        } else {
          console.warn("⚠️ Failed to sync to GHL:", syncResult.error);
        }
      } catch (syncError) {
        console.error("Error syncing to GHL:", syncError);
      }
      break;

    case "invoice.payment_failed":
      const failedInvoice = event.data.object as Stripe.Invoice;
      console.log("Payment failed for invoice:", failedInvoice.id);
      
      // TODO: Notify customer via GHL
      // TODO: Update database
      break;

    case "customer.created":
      const customer = event.data.object as Stripe.Customer;
      console.log("New customer created:", customer.id);
      
      // Sync customer to GoHighLevel
      try {
        const { syncStripeCustomerToGhl } = await import("@/lib/sync/ghl-stripe");
        const syncResult = await syncStripeCustomerToGhl(customer);
        if (syncResult.success) {
          console.log("✅ Synced customer to GHL contact:", syncResult.contactId);
        } else {
          console.warn("⚠️ Failed to sync customer to GHL:", syncResult.error);
        }
      } catch (syncError) {
        console.error("Error syncing customer to GHL:", syncError);
      }
      break;

    case "invoice.created":
      const newInvoice = event.data.object as Stripe.Invoice;
      console.log("New invoice created:", newInvoice.id);
      
      // Sync invoice to GHL opportunity
      try {
        const { syncStripeInvoiceToGhl } = await import("@/lib/sync/ghl-stripe");
        const syncResult = await syncStripeInvoiceToGhl(newInvoice);
        if (syncResult.success) {
          console.log("✅ Synced invoice to GHL opportunity:", syncResult.opportunityId);
        } else {
          console.warn("⚠️ Failed to sync invoice to GHL:", syncResult.error);
        }
      } catch (syncError) {
        console.error("Error syncing invoice to GHL:", syncError);
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

