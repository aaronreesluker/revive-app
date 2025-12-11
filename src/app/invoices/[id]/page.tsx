"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InvoiceTemplate } from "@/components/InvoiceTemplate";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ArrowLeft, Download, Mail, ExternalLink } from "lucide-react";
import type { StripeInvoice } from "@/lib/stripe-types";
import { usePayments } from "@/hooks/usePayments";
import { AppShell } from "@/components/AppShell";

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const { invoices } = usePayments();
  const [invoice, setInvoice] = useState<StripeInvoice | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    const found = invoices.find((inv) => inv.id === invoiceId);
    if (found) {
      setInvoice(found);
      // Set default email values
      setEmailSubject(`Invoice ${found.invoiceNumber} - ${found.customerName}`);
      setEmailRecipient(found.customerEmail || "");
      setEmailMessage(
        `Hi ${found.customerName},\n\nPlease find your invoice attached. If you have any questions, please don't hesitate to reach out.\n\nThank you for your business!`
      );
    }
    setLoading(false);
  }, [invoices, invoiceId]);

  const handleOpenEmailModal = () => {
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!invoice) return;

    if (!emailRecipient || !emailRecipient.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch("/api/invoices/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice,
          paymentUrl: invoice.hostedInvoiceUrl,
          subject: emailSubject || `Invoice ${invoice.invoiceNumber} - ${invoice.customerName}`,
          recipientEmail: emailRecipient,
          customMessage: emailMessage || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEmailModalOpen(false);
        alert(`Invoice email sent to ${emailRecipient}`);
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert(error instanceof Error ? error.message : "Failed to send invoice email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const invoiceElement = document.getElementById("invoice-template");
      if (!invoiceElement) {
        window.print();
        return;
      }

      // Try to generate PDF blob
      try {
        const { generateInvoicePDFBlob } = await import("@/lib/invoice-pdf");
        const blob = await generateInvoicePDFBlob(invoiceElement);
        
        // Download the PDF
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Invoice-${invoice?.invoiceNumber || 'unknown'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        // Fallback to print dialog
        console.warn("PDF generation failed, using print dialog:", error);
        window.print();
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      window.print();
    }
  };

  // Always render AppShell to maintain hook consistency
  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-400">Loading invoice...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-400">Invoice not found</p>
            <Button variant="secondary" className="mt-4" onClick={() => router.push("/payments")}>
              <ArrowLeft size={16} className="mr-2" />
              Back to Payments
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="secondary" onClick={() => router.push("/payments")}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Payments
          </Button>
          <div className="flex gap-3">
            {invoice.hostedInvoiceUrl && (
              <Button variant="secondary" onClick={() => window.open(invoice.hostedInvoiceUrl!, "_blank")}>
                <ExternalLink size={16} className="mr-2" />
                View Payment Link
              </Button>
            )}
            <Button variant="secondary" onClick={handleOpenEmailModal} disabled={sendingEmail}>
              <Mail size={16} className="mr-2" />
              Send Email
            </Button>
            <Button variant="primary" onClick={handleDownloadPDF}>
              <Download size={16} className="mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice */}
        <div id="invoice-template" className="rounded-lg bg-white shadow-lg print:shadow-none">
          <InvoiceTemplate
            invoice={invoice}
            businessName="Your Business Name"
            businessAddress="123 Business Street\nCity, Postcode\nUnited Kingdom"
            businessEmail="billing@yourbusiness.com"
            businessPhone="+44 20 1234 5678"
          />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-print,
          .invoice-print * {
            visibility: visible;
          }
          .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Email Customization Modal */}
      <Modal
        open={emailModalOpen}
        onClose={() => !sendingEmail && setEmailModalOpen(false)}
        title="Customize Invoice Email"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Recipient Email</label>
            <input
              type="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="customer@example.com"
              disabled={sendingEmail}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Email Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Invoice #12345 - Customer Name"
              disabled={sendingEmail}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Custom Message</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="Add a personal message that will appear above the invoice details..."
              disabled={sendingEmail}
            />
            <p className="mt-1 text-xs text-zinc-500">
              This message will appear at the top of the email, before the invoice details.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEmailModalOpen(false)} disabled={sendingEmail}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSendEmail} disabled={sendingEmail || !emailRecipient}>
              <Mail size={16} className="mr-2" />
              {sendingEmail ? "Sending..." : "Send Invoice"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

