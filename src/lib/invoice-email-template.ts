/**
 * Email template for sending invoices
 */

import type { StripeInvoice } from "./stripe-types";

export function generateInvoiceEmailHtml(
  invoice: StripeInvoice,
  paymentUrl?: string,
  customMessage?: string
): string {
  const subtotal = invoice.lineItems?.reduce((sum, item) => sum + item.amount * item.quantity, 0) || invoice.amount;
  const tax = invoice.taxAmount || 0;
  const total = subtotal + tax;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate * 1000).toLocaleDateString("en-GB") : null;
  const createdDate = invoice.created ? new Date(invoice.created * 1000).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">INVOICE</h1>
              <p style="margin: 8px 0 0 0; color: #e0f2fe; font-size: 14px;">Invoice #${invoice.invoiceNumber}</p>
            </td>
          </tr>
          
          <!-- Invoice Details -->
          <tr>
            <td style="padding: 40px;">
              ${customMessage
                ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${customMessage.replace(/\n/g, "<br>")}</p>
                  </td>
                </tr>
              </table>
              `
                : ""}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${invoice.customerName}</p>
                    ${invoice.customerEmail ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${invoice.customerEmail}</p>` : ""}
                  </td>
                  <td align="right" style="padding-bottom: 20px;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Date</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${createdDate}</p>
                    ${dueDate ? `
                    <p style="margin: 12px 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${dueDate}</p>
                    ` : ""}
                  </td>
                </tr>
              </table>
              
              <!-- Line Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th align="left" style="padding: 12px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Description</th>
                    <th align="right" style="padding: 12px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Qty</th>
                    <th align="right" style="padding: 12px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Unit Price</th>
                    <th align="right" style="padding: 12px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.lineItems && invoice.lineItems.length > 0
                    ? invoice.lineItems
                        .map(
                          (item) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 16px 12px;">
                      <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 500;">${item.name}</p>
                      ${item.description ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">${item.description}</p>` : ""}
                    </td>
                    <td align="right" style="padding: 16px 12px; color: #111827; font-size: 14px;">${item.quantity}</td>
                    <td align="right" style="padding: 16px 12px; color: #111827; font-size: 14px;">£${item.amount.toFixed(2)}</td>
                    <td align="right" style="padding: 16px 12px; color: #111827; font-size: 14px; font-weight: 600;">£${(item.amount * item.quantity).toFixed(2)}</td>
                  </tr>
                  `
                        )
                        .join("")
                    : `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 16px 12px;">
                      <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 500;">${invoice.description || "Invoice Item"}</p>
                    </td>
                    <td align="right" style="padding: 16px 12px; color: #111827; font-size: 14px;">1</td>
                    <td align="right" style="padding: 16px 12px; color: #111827; font-size: 14px;">£${invoice.amount.toFixed(2)}</td>
                    <td align="right" style="padding: 16px 12px; color: #111827; font-size: 14px; font-weight: 600;">£${invoice.amount.toFixed(2)}</td>
                  </tr>
                  `}
                </tbody>
              </table>
              
              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td align="right">
                    <table cellpadding="0" cellspacing="0" style="width: 250px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                        <td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">£${subtotal.toFixed(2)}</td>
                      </tr>
                      ${tax > 0
                        ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">VAT (20%)</td>
                        <td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">£${tax.toFixed(2)}</td>
                      </tr>
                      `
                        : ""}
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding: 16px 0 8px 0; color: #111827; font-size: 18px; font-weight: 700;">Total</td>
                        <td align="right" style="padding: 16px 0 8px 0; color: #111827; font-size: 18px; font-weight: 700;">£${total.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Payment CTA -->
              ${invoice.status !== "paid" && paymentUrl
                ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px;">
                <tr>
                  <td align="center" style="padding: 30px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                      Please pay this invoice by ${dueDate || "the due date"}. You can pay securely online using the button below.
                    </p>
                    <a href="${paymentUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Pay Invoice Online</a>
                  </td>
                </tr>
              </table>
              `
                : invoice.status === "paid"
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px;">
                <tr>
                  <td align="center" style="padding: 20px; background-color: #d1fae5; border-radius: 8px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">✓ This invoice has been paid</p>
                  </td>
                </tr>
              </table>
              `
                  : ""}
              
              ${invoice.notes
                ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>Notes:</strong> ${invoice.notes}</p>
                  </td>
                </tr>
              </table>
              `
                : ""}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">Thank you for your business!</p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px;">This is an automated invoice. Please contact us if you have any questions.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateInvoiceEmailText(invoice: StripeInvoice, paymentUrl?: string, customMessage?: string): string {
  const subtotal = invoice.lineItems?.reduce((sum, item) => sum + item.amount * item.quantity, 0) || invoice.amount;
  const tax = invoice.taxAmount || 0;
  const total = subtotal + tax;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate * 1000).toLocaleDateString("en-GB") : null;
  const createdDate = invoice.created ? new Date(invoice.created * 1000).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

  let text = `INVOICE ${invoice.invoiceNumber}\n\n`;
  
  if (customMessage) {
    text += `${customMessage}\n\n`;
    text += `---\n\n`;
  }
  
  text += `Bill To: ${invoice.customerName}\n`;
  if (invoice.customerEmail) text += `Email: ${invoice.customerEmail}\n`;
  text += `\nInvoice Date: ${createdDate}\n`;
  if (dueDate) text += `Due Date: ${dueDate}\n`;
  text += `\n---\n\n`;

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    invoice.lineItems.forEach((item) => {
      text += `${item.name}${item.description ? ` - ${item.description}` : ""}\n`;
      text += `  Quantity: ${item.quantity} × £${item.amount.toFixed(2)} = £${(item.amount * item.quantity).toFixed(2)}\n\n`;
    });
  } else {
    text += `${invoice.description || "Invoice Item"}\n`;
    text += `  Amount: £${invoice.amount.toFixed(2)}\n\n`;
  }

  text += `Subtotal: £${subtotal.toFixed(2)}\n`;
  if (tax > 0) text += `VAT (20%): £${tax.toFixed(2)}\n`;
  text += `Total: £${total.toFixed(2)}\n`;

  if (invoice.status !== "paid" && paymentUrl) {
    text += `\nPlease pay this invoice by ${dueDate || "the due date"}.\n`;
    text += `Pay online: ${paymentUrl}\n`;
  }

  if (invoice.notes) {
    text += `\nNotes: ${invoice.notes}\n`;
  }

  text += `\nThank you for your business!`;

  return text;
}

