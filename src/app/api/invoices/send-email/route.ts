/**
 * API Route: POST /api/invoices/send-email
 * Send invoice via email
 */

import { NextResponse } from "next/server";
import { generateInvoiceEmailHtml, generateInvoiceEmailText } from "@/lib/invoice-email-template";
import { sendGhlEmail, triggerGhlWorkflowEmail } from "@/lib/ghl/email";
import type { StripeInvoice } from "@/lib/stripe-types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoice, paymentUrl, recipientEmail, subject, customMessage } = body as {
      invoice: StripeInvoice;
      paymentUrl?: string;
      recipientEmail?: string;
      subject?: string;
      customMessage?: string;
    };

    if (!invoice || !invoice.customerEmail) {
      return NextResponse.json({ error: "Invoice and customer email are required" }, { status: 400 });
    }

    const emailTo = recipientEmail || invoice.customerEmail;
    const emailSubject = subject || `Invoice ${invoice.invoiceNumber} - ${invoice.customerName}`;
    const html = generateInvoiceEmailHtml(invoice, paymentUrl, customMessage);
    const text = generateInvoiceEmailText(invoice, paymentUrl, customMessage);

    // Calculate invoice totals (same logic as email template)
    const subtotal = invoice.lineItems?.reduce((sum, item) => sum + item.amount * item.quantity, 0) || invoice.amount;
    const tax = invoice.taxAmount || 0;
    const total = subtotal + tax;

    // Format amounts and dates for GHL custom fields
    const invoiceAmount = `£${total.toFixed(2)}`;
    const invoiceDueDate = invoice.dueDate
      ? new Date(invoice.dueDate * 1000).toISOString().split("T")[0] // YYYY-MM-DD format
      : new Date().toISOString().split("T")[0];

    // Try to trigger GHL workflow first (workaround for plans without email API)
    // This updates the contact with custom fields and the "invoice:send" tag
    // The GHL workflow then sends the email using its native email action
    const workflowResult = await triggerGhlWorkflowEmail({
      to: emailTo,
      invoiceNumber: invoice.invoiceNumber || `INV-${Date.now()}`,
      invoiceAmount,
      invoiceDueDate,
      invoicePayLink: paymentUrl || "",
      customerName: invoice.customerName,
    });

    if (workflowResult.success) {
      console.log("✅ GHL workflow triggered successfully:", workflowResult.contactId);
      return NextResponse.json({
        success: true,
        message: "Invoice email workflow triggered successfully. GHL will send the email.",
        emailTo,
        contactId: workflowResult.contactId,
        provider: "gohighlevel-workflow",
        workflowTriggered: true,
      });
    }

    // Fallback: Try direct email API (may not work on lower plans)
    console.log("⚠️ Workflow trigger failed, trying direct email API:", workflowResult.error);
    const ghlResult = await sendGhlEmail({
      to: emailTo,
      subject: emailSubject,
      html,
      text,
      fromName: "Revive Invoicing",
    });

    if (ghlResult.success) {
      console.log("✅ Invoice email sent via GoHighLevel API:", ghlResult.messageId);
      return NextResponse.json({
        success: true,
        message: "Invoice email sent successfully via GoHighLevel API",
        emailTo,
        messageId: ghlResult.messageId,
        provider: "gohighlevel-api",
      });
    }

    // Final fallback: Log for demo/testing (or use another email service)
    console.log("⚠️ All GHL methods failed, using fallback:", ghlResult.error);
    console.log("=== INVOICE EMAIL (FALLBACK) ===");
    console.log(`To: ${emailTo}`);
    console.log(`Subject: ${emailSubject}`);
    console.log("\n--- HTML Email ---\n");
    console.log(html.substring(0, 500) + "...");
    console.log("\n--- Text Email ---\n");
    console.log(text);

    // In production, you could fallback to Resend, SendGrid, etc.
    // For now, we'll return success with a warning
    return NextResponse.json({
      success: true,
      message: "Invoice email prepared (GHL unavailable, check logs for preview)",
      emailTo,
      warning: `Workflow: ${workflowResult.error}; API: ${ghlResult.error}`,
      provider: "fallback",
      preview: {
        html,
        text,
        subject: emailSubject,
      },
    });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send invoice email",
      },
      { status: 500 }
    );
  }
}

