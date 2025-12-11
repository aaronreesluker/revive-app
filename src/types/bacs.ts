/**
 * BACS Direct Debit types and interfaces
 */

export type BacsMandateStatus = 
  | "pending"      // Mandate setup in progress
  | "active"        // Mandate is active and can be used
  | "cancelled"     // Mandate has been cancelled
  | "failed"        // Mandate setup failed
  | "expired";      // Mandate has expired

export type BacsMandate = {
  id: string;
  customerName: string;
  customerEmail: string;
  accountHolderName: string;
  sortCode: string; // 6 digits, format: XX-XX-XX
  accountNumber: string; // 8 digits
  reference: string; // Unique mandate reference
  status: BacsMandateStatus;
  stripeMandateId?: string; // Stripe mandate ID if using Stripe
  stripeCustomerId?: string; // Stripe customer ID
  stripePaymentMethodId?: string; // Stripe payment method ID
  createdAt: number;
  activatedAt?: number;
  cancelledAt?: number;
  expiresAt?: number;
  createdBy?: string; // User ID who created the mandate
};

export type BacsSetupRequest = {
  customerName: string;
  customerEmail: string;
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
  amount?: number; // Optional initial payment amount
  description?: string;
};

export type BacsSetupResponse = {
  mandateId: string;
  mandateReference: string;
  status: BacsMandateStatus;
  setupUrl?: string; // URL for customer to complete mandate setup (if required)
  stripeClientSecret?: string; // Stripe client secret for mandate setup
};

