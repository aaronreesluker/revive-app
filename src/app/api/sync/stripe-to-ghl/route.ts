/**
 * API Route: POST /api/sync/stripe-to-ghl
 * Manually sync Stripe customers/invoices to GHL
 */

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { syncStripeCustomerToGhl, syncStripeInvoiceToGhl } from "@/lib/sync/ghl-stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { customerId, invoiceId, locationId } = body;

    const stripe = await getStripe();
    const results: any[] = [];

    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        const syncResult = await syncStripeCustomerToGhl(customer as any, locationId);
        results.push({
          type: "customer",
          id: customerId,
          success: syncResult.success,
          contactId: syncResult.contactId,
          error: syncResult.error,
        });
      }
    }

    if (invoiceId) {
      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ["customer"],
      });
      const syncResult = await syncStripeInvoiceToGhl(invoice, locationId);
      results.push({
        type: "invoice",
        id: invoiceId,
        success: syncResult.success,
        opportunityId: syncResult.opportunityId,
        error: syncResult.error,
      });
    }

    if (!customerId && !invoiceId) {
      // Sync all recent customers and invoices
      const customers = await stripe.customers.list({ limit: 10 });
      const invoices = await stripe.invoices.list({ limit: 10 });

      for (const customer of customers.data) {
        const syncResult = await syncStripeCustomerToGhl(customer, locationId);
        results.push({
          type: "customer",
          id: customer.id,
          success: syncResult.success,
          contactId: syncResult.contactId,
          error: syncResult.error,
        });
      }

      for (const invoice of invoices.data) {
        const syncResult = await syncStripeInvoiceToGhl(invoice, locationId);
        results.push({
          type: "invoice",
          id: invoice.id,
          success: syncResult.success,
          opportunityId: syncResult.opportunityId,
          error: syncResult.error,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      synced: successful,
      failed,
      results,
      message: `Synced ${successful} items${failed > 0 ? `, ${failed} failed` : ""}`,
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

