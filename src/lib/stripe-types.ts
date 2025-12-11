/**
 * Stripe types - safe to import in client components
 */

export type InvoiceLineItem = {
  name: string;
  description?: string;
  quantity: number;
  amount: number; // Unit price
};

export type StripeInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  amount: number;
  status: "paid" | "open" | "draft" | "void" | "uncollectible";
  dueDate: number | null;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  lineItems?: InvoiceLineItem[];
  description?: string;
  taxAmount?: number;
  notes?: string;
  createdBy?: string; // User ID who created this invoice
};

