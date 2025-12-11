/**
 * API Route: POST /api/payments/request
 * Create a payment request and return a shareable payment link
 */

import { NextResponse } from "next/server";

type PaymentItem = {
  name: string;
  price: number; // price per unit in major units
  quantity: number;
  productId?: string;
};

type RequestBody = {
  customerName: string;
  customerEmail?: string;
  amount?: number; // optional, will compute from items if missing
  description?: string;
  invoiceId?: string;
  items?: PaymentItem[];
  paymentDate?: string;
  billingType?: "one_time" | "recurring";
  billingInterval?: "weekly" | "monthly" | "quarterly" | "yearly";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body || !body.customerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let amount = body.amount ?? 0;
    if ((!body.amount || body.amount <= 0) && body.items && body.items.length > 0) {
      amount = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    // Get tenant ID and connected account ID from request (in production, get from auth session)
    const tenantId = request.headers.get("x-tenant-id") || "demo-agency";
    const connectedAccountId = request.headers.get("x-stripe-account-id"); // Client passes this if connected

    // Try Stripe Connect payment link if connected account ID provided
    let url: string | null = null;
    try {
      if (connectedAccountId) {
        // Use Stripe Connect to create payment link on connected account
        const stripeConnect = await import("@/lib/stripe-connect");
        url = await stripeConnect.createPaymentLinkForConnectedAccount(
          connectedAccountId,
          amount,
          "gbp",
          body.customerName,
          body.customerEmail,
          body.description || "Payment request"
        );
      } else if (body.invoiceId) {
        // Fallback to regular Stripe if invoice ID provided
        const stripeLib = await import("@/lib/stripe");
        url = await stripeLib.createPaymentLink(body.invoiceId);
      }
    } catch (error) {
      console.error("Error creating Stripe payment link:", error);
      // Fall through to mock URL
    }

    if (!url) {
      const slug = encodeURIComponent(
        `${body.customerName}-${Math.round(amount * 100)}-${Date.now()}`
      );
      url = `https://pay.example.com/request/${slug}`;
    }

    return NextResponse.json({
      link: url,
      message: "Payment request created",
      amount,
      items: body.items ?? [],
      paymentDate: body.paymentDate ?? null,
      billingType: body.billingType ?? "one_time",
      billingInterval: body.billingInterval ?? null,
    });
  } catch (error) {
    console.error("Error creating payment request:", error);
    return NextResponse.json({ error: "Failed to create payment request" }, { status: 500 });
  }
}


