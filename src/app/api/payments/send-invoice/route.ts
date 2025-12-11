/**
 * API Route: POST /api/payments/send-invoice
 * Send an invoice email (mock implementation)
 */

import { NextResponse } from "next/server";

type SendBody = {
  invoiceId?: string;
  customerEmail: string;
  subject?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendBody;
    if (!body.customerEmail) {
      return NextResponse.json({ error: "customerEmail is required" }, { status: 400 });
    }

    // In a real impl, send via transactional email service.
    console.log("[send-invoice]", body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 });
  }
}


