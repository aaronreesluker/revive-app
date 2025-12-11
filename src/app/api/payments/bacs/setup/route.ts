/**
 * API Route: POST /api/payments/bacs/setup
 * Setup a BACS Direct Debit mandate
 */

import { NextResponse } from "next/server";
import type { BacsSetupRequest, BacsSetupResponse } from "@/types/bacs";

// Validate UK sort code format (6 digits)
function validateSortCode(sortCode: string): boolean {
  const cleaned = sortCode.replace(/-/g, "");
  return /^\d{6}$/.test(cleaned);
}

// Validate UK account number format (8 digits)
function validateAccountNumber(accountNumber: string): boolean {
  const cleaned = accountNumber.replace(/\s/g, "");
  return /^\d{8}$/.test(cleaned);
}

// Format sort code as XX-XX-XX
function formatSortCode(sortCode: string): string {
  const cleaned = sortCode.replace(/-/g, "");
  if (cleaned.length !== 6) return sortCode;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
}

// Generate unique mandate reference
function generateMandateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BACS-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BacsSetupRequest;
    
    if (!body.customerName || !body.customerEmail || !body.accountHolderName || !body.sortCode || !body.accountNumber) {
      return NextResponse.json(
        { error: "Missing required fields: customerName, customerEmail, accountHolderName, sortCode, accountNumber" },
        { status: 400 }
      );
    }

    // Validate sort code and account number
    if (!validateSortCode(body.sortCode)) {
      return NextResponse.json(
        { error: "Invalid sort code. Must be 6 digits (format: XX-XX-XX)" },
        { status: 400 }
      );
    }

    if (!validateAccountNumber(body.accountNumber)) {
      return NextResponse.json(
        { error: "Invalid account number. Must be 8 digits" },
        { status: 400 }
      );
    }

    const tenantId = request.headers.get("x-tenant-id") || "demo-agency";
    const connectedAccountId = request.headers.get("x-stripe-account-id");

    const formattedSortCode = formatSortCode(body.sortCode);
    const mandateReference = generateMandateReference();
    const mandateId = `mandate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let stripeCustomerId: string | undefined;
    let stripePaymentMethodId: string | undefined;
    let stripeMandateId: string | undefined;
    let stripeClientSecret: string | undefined;
    let setupUrl: string | undefined;

    // Try to create BACS mandate via Stripe if connected account is available
    if (connectedAccountId) {
      try {
        const stripeConnect = await import("@/lib/stripe-connect");
        const bacsResult = await stripeConnect.createBacsMandate(
          connectedAccountId,
          {
            customerName: body.customerName,
            customerEmail: body.customerEmail,
            accountHolderName: body.accountHolderName,
            sortCode: formattedSortCode,
            accountNumber: body.accountNumber,
            amount: body.amount,
            description: body.description,
          }
        );

        stripeCustomerId = bacsResult.customerId;
        stripePaymentMethodId = bacsResult.paymentMethodId;
        stripeMandateId = bacsResult.mandateId;
        stripeClientSecret = bacsResult.clientSecret;
        setupUrl = bacsResult.setupUrl;
      } catch (error) {
        console.error("Error creating Stripe BACS mandate:", error);
        // Fall through to local mandate creation
      }
    }

    const response: BacsSetupResponse = {
      mandateId,
      mandateReference,
      status: stripeClientSecret ? "pending" : "active", // If Stripe setup required, status is pending
      setupUrl,
      stripeClientSecret,
    };

    return NextResponse.json({
      ...response,
      stripeCustomerId,
      stripePaymentMethodId,
      stripeMandateId,
    });
  } catch (error) {
    console.error("Error setting up BACS mandate:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to setup BACS mandate" },
      { status: 500 }
    );
  }
}

