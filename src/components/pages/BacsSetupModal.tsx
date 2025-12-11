/**
 * Modal component for setting up BACS Direct Debit mandates
 */

"use client";

import { useState } from "react";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { useBacsMandates } from "@/hooks/useBacsMandates";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEventLog } from "@/context/EventLogContext";
import type { BacsSetupRequest } from "@/types/bacs";

type BacsSetupModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (mandateId: string) => void;
  initialCustomerName?: string;
  initialCustomerEmail?: string;
};

export function BacsSetupModal({
  open,
  onClose,
  onSuccess,
  initialCustomerName = "",
  initialCustomerEmail = "",
}: BacsSetupModalProps) {
  const { setupMandate, loading, error } = useBacsMandates();
  const { recordEvent } = useEventLog();
  const [formData, setFormData] = useState<BacsSetupRequest>({
    customerName: initialCustomerName,
    customerEmail: initialCustomerEmail,
    accountHolderName: "",
    sortCode: "",
    accountNumber: "",
    description: "",
  });
  const [setupResult, setSetupResult] = useState<{
    mandateId: string;
    mandateReference: string;
    setupUrl?: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      errors.customerName = "Customer name is required";
    }

    if (!formData.customerEmail.trim()) {
      errors.customerEmail = "Customer email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      errors.customerEmail = "Invalid email address";
    }

    if (!formData.accountHolderName.trim()) {
      errors.accountHolderName = "Account holder name is required";
    }

    // Validate sort code (6 digits, can have dashes)
    const sortCodeCleaned = formData.sortCode.replace(/-/g, "");
    if (!sortCodeCleaned) {
      errors.sortCode = "Sort code is required";
    } else if (!/^\d{6}$/.test(sortCodeCleaned)) {
      errors.sortCode = "Sort code must be 6 digits (format: XX-XX-XX)";
    }

    // Validate account number (8 digits)
    const accountNumberCleaned = formData.accountNumber.replace(/\s/g, "");
    if (!accountNumberCleaned) {
      errors.accountNumber = "Account number is required";
    } else if (!/^\d{8}$/.test(accountNumberCleaned)) {
      errors.accountNumber = "Account number must be 8 digits";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatSortCode = (value: string): string => {
    const cleaned = value.replace(/-/g, "").replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setSetupResult(null);

    if (!validateForm()) {
      return;
    }

    try {
      const result = await setupMandate({
        ...formData,
        sortCode: formData.sortCode.replace(/-/g, ""),
        accountNumber: formData.accountNumber.replace(/\s/g, ""),
      });

      setSetupResult({
        mandateId: result.mandateId,
        mandateReference: result.mandateReference,
        setupUrl: result.setupUrl,
      });

      recordEvent({
        category: "payments",
        action: "bacs_mandate_created",
        summary: `BACS mandate created for ${formData.customerName}`,
        meta: {
          customerEmail: formData.customerEmail,
          mandateId: result.mandateId,
          hasRedirect: !!result.setupUrl,
        },
      });

      // If setup URL is provided, redirect customer to complete setup
      if (result.setupUrl) {
        window.open(result.setupUrl, "_blank");
      }

      if (onSuccess) {
        onSuccess(result.mandateId);
      }
    } catch (err) {
      // Error is handled by the hook
      console.error("Failed to setup BACS mandate:", err);
      recordEvent({
        category: "payments",
        action: "bacs_mandate_error",
        summary: "Failed to setup BACS mandate",
        severity: "warning",
        meta: {
          message: err instanceof Error ? err.message : String(err),
          customerEmail: formData.customerEmail,
        },
      });
    }
  };

  const handleClose = () => {
    setFormData({
      customerName: initialCustomerName,
      customerEmail: initialCustomerEmail,
      accountHolderName: "",
      sortCode: "",
      accountNumber: "",
      description: "",
    });
    setSetupResult(null);
    setValidationErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Setup BACS Direct Debit">
      {setupResult ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-emerald-300">Mandate Setup Successful</h3>
              <p className="mt-1 text-xs text-emerald-200/80">
                BACS Direct Debit mandate has been created successfully.
              </p>
              <div className="mt-3 space-y-1 text-xs">
                <div>
                  <span className="text-emerald-200/60">Mandate Reference: </span>
                  <span className="font-mono font-semibold text-emerald-200">{setupResult.mandateReference}</span>
                </div>
                <div>
                  <span className="text-emerald-200/60">Mandate ID: </span>
                  <span className="font-mono text-emerald-200">{setupResult.mandateId}</span>
                </div>
              </div>
            </div>
          </div>

          {setupResult.setupUrl && (
            <div className="rounded-lg bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
                <div className="flex-1">
                  <p className="text-xs text-amber-200/80">
                    Customer needs to complete mandate setup. A new window has been opened for them to authorize the mandate.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-rose-500/10 p-4 ring-1 ring-rose-500/20">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-400" />
              <div className="flex-1">
                <p className="text-xs text-rose-200">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Customer Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className={`w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 ${
                    validationErrors.customerName ? "ring-rose-500" : ""
                  }`}
                  value={formData.customerName}
                  onChange={(e) => {
                    setFormData({ ...formData, customerName: e.target.value });
                    if (validationErrors.customerName) {
                      setValidationErrors({ ...validationErrors, customerName: "" });
                    }
                  }}
                />
                {validationErrors.customerName && (
                  <p className="mt-1 text-xs text-rose-400">{validationErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Customer Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  className={`w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 ${
                    validationErrors.customerEmail ? "ring-rose-500" : ""
                  }`}
                  value={formData.customerEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, customerEmail: e.target.value });
                    if (validationErrors.customerEmail) {
                      setValidationErrors({ ...validationErrors, customerEmail: "" });
                    }
                  }}
                />
                {validationErrors.customerEmail && (
                  <p className="mt-1 text-xs text-rose-400">{validationErrors.customerEmail}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Account Holder Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                className={`w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2 ${
                  validationErrors.accountHolderName ? "ring-rose-500" : ""
                }`}
                value={formData.accountHolderName}
                onChange={(e) => {
                  setFormData({ ...formData, accountHolderName: e.target.value });
                  if (validationErrors.accountHolderName) {
                    setValidationErrors({ ...validationErrors, accountHolderName: "" });
                  }
                }}
                placeholder="Name as it appears on bank account"
              />
              {validationErrors.accountHolderName && (
                <p className="mt-1 text-xs text-rose-400">{validationErrors.accountHolderName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Sort Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  className={`w-full rounded-md bg-transparent px-3 py-2 font-mono ring-1 app-ring focus:outline-none focus:ring-2 ${
                    validationErrors.sortCode ? "ring-rose-500" : ""
                  }`}
                  value={formData.sortCode}
                  onChange={(e) => {
                    const formatted = formatSortCode(e.target.value);
                    setFormData({ ...formData, sortCode: formatted });
                    if (validationErrors.sortCode) {
                      setValidationErrors({ ...validationErrors, sortCode: "" });
                    }
                  }}
                  placeholder="XX-XX-XX"
                />
                {validationErrors.sortCode && (
                  <p className="mt-1 text-xs text-rose-400">{validationErrors.sortCode}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Account Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  className={`w-full rounded-md bg-transparent px-3 py-2 font-mono ring-1 app-ring focus:outline-none focus:ring-2 ${
                    validationErrors.accountNumber ? "ring-rose-500" : ""
                  }`}
                  value={formData.accountNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setFormData({ ...formData, accountNumber: cleaned });
                    if (validationErrors.accountNumber) {
                      setValidationErrors({ ...validationErrors, accountNumber: "" });
                    }
                  }}
                  placeholder="8 digits"
                />
                {validationErrors.accountNumber && (
                  <p className="mt-1 text-xs text-rose-400">{validationErrors.accountNumber}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Description (Optional)
              </label>
              <textarea
                rows={2}
                className="w-full rounded-md bg-transparent px-3 py-2 text-xs ring-1 app-ring focus:outline-none focus:ring-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this mandate"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Setup Mandate"
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

