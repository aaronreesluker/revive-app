/**
 * API Route: POST /api/invoices/create
 * Create a professional invoice with line items
 */

import { NextResponse } from "next/server";
import type { StripeInvoice, InvoiceLineItem } from "@/lib/stripe-types";

type RequestBody = {
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  lineItems: InvoiceLineItem[];
  description?: string;
  notes?: string;
  dueDate?: string; // ISO date string
  taxAmount?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.customerName || !body.customerEmail || !body.lineItems || body.lineItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: customerName, customerEmail, and lineItems are required" },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = body.lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);
    const tax = body.taxAmount ?? subtotal * 0.2; // Default 20% VAT
    const total = subtotal + tax;

    // Get tenant ID and connected account ID
    const tenantId = request.headers.get("x-tenant-id") || "demo-agency";
    const connectedAccountId = request.headers.get("x-stripe-account-id");

    const createdAt = Math.floor(Date.now() / 1000);
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    // Create invoice object
    const invoice: StripeInvoice = {
      id: `invoice-${Date.now()}`,
      invoiceNumber,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerAddress: body.customerAddress,
      amount: total,
      status: "open",
      dueDate: body.dueDate ? Math.floor(new Date(body.dueDate).getTime() / 1000) : null,
      created: createdAt,
      hostedInvoiceUrl: null,
      invoicePdf: null,
      lineItems: body.lineItems,
      description: body.description,
      taxAmount: tax,
      notes: body.notes,
    };

    // If Stripe Connect is available, create invoice on Stripe
    if (connectedAccountId) {
      try {
        const stripeConnect = await import("@/lib/stripe-connect");
        const stripeInvoice = await stripeConnect.createInvoiceForConnectedAccount(
          connectedAccountId,
          body.customerEmail,
          total,
          "gbp",
          body.description || "Invoice",
          body.lineItems
        );

        // Update invoice with Stripe data
        invoice.id = stripeInvoice.id;
        invoice.hostedInvoiceUrl = stripeInvoice.hosted_invoice_url || null;
        invoice.invoicePdf = stripeInvoice.invoice_pdf || null;
        invoice.status = stripeInvoice.status as StripeInvoice["status"];
      } catch (error) {
        console.error("Error creating Stripe invoice:", error);
        // Continue with local invoice if Stripe fails
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create invoice",
      },
      { status: 500 }
    );
  }
}

