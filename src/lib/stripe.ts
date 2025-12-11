/**
 * Stripe server-side utilities
 * Use this file ONLY in server-side code (API routes, server components)
 * DO NOT import this in client components
 */

import type { StripeInvoice } from "./stripe-types";

// Only initialize Stripe if we have a key (for development without keys)
let stripe: any = null;

async function getStripe() {
  if (stripe) return stripe;
  
  // Dynamically import Stripe to avoid client-side bundling
  let Stripe;
  try {
    Stripe = (await import("stripe")).default;
  } catch (error) {
    throw new Error(
      "Stripe package is not installed. Run 'npm install stripe' to install it."
    );
  }
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // During build/dev without keys, return a mock that will fail at runtime
    // This prevents build errors when keys aren't set yet
    throw new Error(
      "STRIPE_SECRET_KEY is not set in environment variables. " +
      "Add it to your .env.local file. See docs/SETUP_INTEGRATIONS.md for instructions."
    );
  }

  stripe = new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia" as any,
    typescript: true,
  });
  
  return stripe;
}

export { getStripe };

/**
 * Fetch invoices from Stripe
 */
export async function getStripeInvoices(limit: number = 10): Promise<StripeInvoice[]> {
  const stripeInstance = await getStripe();
  const invoices = await stripeInstance.invoices.list({
    limit,
    expand: ["data.customer"],
  });

  return invoices.data.map((invoice: any) => ({
    id: invoice.id,
    invoiceNumber: invoice.number || invoice.id,
    customerName:
      typeof invoice.customer === "object" && invoice.customer
        ? (invoice.customer.name || invoice.customer.email || "Unknown")
        : "Unknown",
    customerEmail:
      typeof invoice.customer === "object" && invoice.customer
        ? invoice.customer.email || ""
        : "",
    amount: invoice.amount_due / 100, // Convert from cents
    status: invoice.status as StripeInvoice["status"],
    dueDate: invoice.due_date,
    created: invoice.created,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
  }));
}

/**
 * Create a payment link for an invoice
 */
export async function createPaymentLink(invoiceId: string): Promise<string> {
  const stripeInstance = await getStripe();
  const invoice = await stripeInstance.invoices.retrieve(invoiceId);
  
  if (invoice.hosted_invoice_url) {
    return invoice.hosted_invoice_url;
  }

  // Create a checkout session if no hosted invoice URL
  const session = await stripeInstance.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Invoice ${invoice.number || invoiceId}`,
          },
          unit_amount: invoice.amount_due,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?canceled=true`,
    metadata: {
      invoice_id: invoiceId,
    },
  });

  return session.url || "";
}

