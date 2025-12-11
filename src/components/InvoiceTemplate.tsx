"use client";

import { format } from "date-fns";
import type { StripeInvoice } from "@/lib/stripe-types";

interface InvoiceTemplateProps {
  invoice: StripeInvoice;
  businessName?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessVatNumber?: string;
  logoUrl?: string;
}

export function InvoiceTemplate({
  invoice,
  businessName = "Your Business Name",
  businessAddress = "123 Business Street\nCity, Postcode\nUnited Kingdom",
  businessEmail = "billing@yourbusiness.com",
  businessPhone = "+44 20 1234 5678",
  businessVatNumber,
  logoUrl,
}: InvoiceTemplateProps) {
  const subtotal = invoice.lineItems?.reduce((sum, item) => sum + item.amount * item.quantity, 0) || invoice.amount;
  const tax = invoice.taxAmount || 0;
  const total = subtotal + tax;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate * 1000) : null;
  const createdDate = invoice.created ? new Date(invoice.created * 1000) : new Date();

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-gray-900 shadow-lg print:shadow-none">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between border-b-2 border-gray-200 pb-6">
        <div>
          {logoUrl && (
            <img src={logoUrl} alt={businessName} className="mb-4 h-16 w-auto" />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{businessName}</h1>
          <div className="mt-2 whitespace-pre-line text-sm text-gray-600">
            {businessAddress}
          </div>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {businessEmail && <div>Email: {businessEmail}</div>}
            {businessPhone && <div>Phone: {businessPhone}</div>}
            {businessVatNumber && <div>VAT: {businessVatNumber}</div>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold text-gray-900">INVOICE</h2>
          <div className="mt-4 space-y-1 text-sm">
            <div className="text-gray-600">Invoice #</div>
            <div className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Bill To</h3>
          <div className="text-gray-900">
            <div className="font-semibold">{invoice.customerName}</div>
            {invoice.customerEmail && <div className="mt-1 text-sm text-gray-600">{invoice.customerEmail}</div>}
            {invoice.customerAddress && (
              <div className="mt-2 whitespace-pre-line text-sm text-gray-600">{invoice.customerAddress}</div>
            )}
          </div>
        </div>
        <div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-500">Invoice Date</div>
              <div className="mt-1 font-semibold text-gray-900">{format(createdDate, "dd MMM yyyy")}</div>
            </div>
            {dueDate && (
              <div>
                <div className="text-gray-500">Due Date</div>
                <div className="mt-1 font-semibold text-gray-900">{format(dueDate, "dd MMM yyyy")}</div>
              </div>
            )}
            <div>
              <div className="text-gray-500">Status</div>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    invoice.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : invoice.status === "open"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {invoice.status === "paid" ? "Paid" : invoice.status === "open" ? "Due" : invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-gray-700">
                Description
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide text-gray-700">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide text-gray-700">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide text-gray-700">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems && invoice.lineItems.length > 0 ? (
              invoice.lineItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && <div className="mt-1 text-sm text-gray-500">{item.description}</div>}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-4 text-right text-gray-900">£{item.amount.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    £{(item.amount * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900">{invoice.description || "Invoice Item"}</div>
                </td>
                <td className="px-4 py-4 text-right text-gray-900">1</td>
                <td className="px-4 py-4 text-right text-gray-900">£{invoice.amount.toFixed(2)}</td>
                <td className="px-4 py-4 text-right font-semibold text-gray-900">£{invoice.amount.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="ml-auto w-64">
        <div className="space-y-2 border-t-2 border-gray-200 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">£{subtotal.toFixed(2)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (20%)</span>
              <span className="font-medium text-gray-900">£{tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">£{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      {invoice.status !== "paid" && (
        <div className="mt-8 rounded-lg bg-gray-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">Payment Instructions</h3>
          <p className="text-sm text-gray-600">
            Please pay this invoice by {dueDate ? format(dueDate, "dd MMM yyyy") : "the due date"}. You can pay
            securely online using the payment link provided in the email.
          </p>
          {invoice.hostedInvoiceUrl && (
            <a
              href={invoice.hostedInvoiceUrl}
              className="mt-4 inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Pay Invoice Online
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
        {invoice.notes && (
          <p className="mt-2 text-left text-sm text-gray-600">
            <strong>Notes:</strong> {invoice.notes}
          </p>
        )}
      </div>
    </div>
  );
}


