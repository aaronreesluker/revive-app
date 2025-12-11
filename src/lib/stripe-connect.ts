/**
 * Stripe Connect utilities
 * Handles OAuth flow and connected account management
 */

import type Stripe from "stripe";

/**
 * Get the Stripe Connect client ID from environment
 */
export function getStripeConnectClientId(): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "STRIPE_CONNECT_CLIENT_ID is not set in environment variables. " +
      "Get it from your Stripe Dashboard > Settings > Connect > Integration settings."
    );
  }
  return clientId;
}

/**
 * Generate Stripe Connect OAuth URL
 * @param tenantId - The tenant/business ID
 * @param redirectUri - Where to redirect after OAuth (e.g., /settings?stripe_connected=true)
 */
export async function generateStripeConnectUrl(
  tenantId: string,
  redirectUri: string
): Promise<string> {
  const clientId = getStripeConnectClientId();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const fullRedirectUri = `${baseUrl}${redirectUri}`;

  // Stripe Connect OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: fullRedirectUri,
    response_type: "code",
    scope: "read_write",
    state: tenantId, // Pass tenant ID in state for verification
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for connected account ID
 * @param code - OAuth authorization code from Stripe
 */
export async function exchangeStripeConnectCode(code: string): Promise<{
  accountId: string;
  email: string;
  detailsSubmitted: boolean;
}> {
  try {
    const { getStripe } = await import("./stripe");
    const stripe = await getStripe();

    // Exchange code for access token and account ID
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    // Retrieve connected account details
    const account = await stripe.accounts.retrieve(response.stripe_user_id);

    return {
      accountId: response.stripe_user_id,
      email: account.email || "",
      detailsSubmitted: account.details_submitted || false,
    };
  } catch (error) {
    // If Stripe keys are not configured, return a mock account for demo
    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      console.warn("Stripe keys not configured. Using mock account for demo.");
      return {
        accountId: `acct_demo_${Date.now()}`,
        email: "demo@example.com",
        detailsSubmitted: true,
      };
    }
    throw error;
  }
}

/**
 * Get connected account details
 */
export async function getConnectedAccount(accountId: string): Promise<Stripe.Account | null> {
  try {
    const { getStripe } = await import("./stripe");
    const stripe = await getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error("Error retrieving connected account:", error);
    return null;
  }
}

/**
 * Create a payment link using a connected account
 */
export async function createPaymentLinkForConnectedAccount(
  accountId: string,
  amount: number,
  currency: string = "gbp",
  customerName?: string,
  customerEmail?: string,
  description?: string
): Promise<string> {
  try {
    const { getStripe } = await import("./stripe");
    const stripe = await getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    // Create checkout session on connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description || "Payment",
              },
              unit_amount: Math.round(amount * 100), // Convert to cents/pence
            },
            quantity: 1,
          },
        ],
        customer_email: customerEmail,
        metadata: {
          customer_name: customerName || "",
        },
        success_url: `${baseUrl}/payments?success=true`,
        cancel_url: `${baseUrl}/payments?canceled=true`,
      },
      {
        stripeAccount: accountId, // Use connected account
      }
    );

    return session.url || "";
  } catch (error) {
    // If Stripe keys are not configured, return a mock URL for demo
    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      console.warn("Stripe keys not configured. Using mock payment URL for demo.");
      const slug = encodeURIComponent(`${customerName || "customer"}-${Math.round(amount * 100)}-${Date.now()}`);
      return `https://checkout.stripe.com/pay/${slug}`;
    }
    throw error;
  }
}

/**
 * Create an invoice on a connected account with line items
 */
export async function createInvoiceForConnectedAccount(
  accountId: string,
  customerEmail: string,
  amount: number,
  currency: string = "gbp",
  description?: string,
  lineItems?: Array<{ name: string; description?: string; quantity: number; amount: number }>
): Promise<Stripe.Invoice> {
  try {
    const { getStripe } = await import("./stripe");
    const stripe = await getStripe();

    // Create customer on connected account
    const customer = await stripe.customers.create(
      {
        email: customerEmail,
      },
      {
        stripeAccount: accountId,
      }
    );

    // Create invoice items
    if (lineItems && lineItems.length > 0) {
      // Create multiple invoice items for line items
      for (const item of lineItems) {
        await stripe.invoiceItems.create(
          {
            customer: customer.id,
            amount: Math.round(item.amount * 100), // Convert to cents/pence
            currency: currency.toLowerCase(),
            quantity: item.quantity,
            description: item.description || item.name,
          },
          {
            stripeAccount: accountId,
          }
        );
      }
    } else {
      // Single invoice item
      await stripe.invoiceItems.create(
        {
          customer: customer.id,
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          description: description || "Invoice",
        },
        {
          stripeAccount: accountId,
        }
      );
    }

    // Create and finalize invoice
    const invoice = await stripe.invoices.create(
      {
        customer: customer.id,
        auto_advance: true, // Automatically finalize
      },
      {
        stripeAccount: accountId,
      }
    );

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      invoice.id,
      {},
      {
        stripeAccount: accountId,
      }
    );

    return finalizedInvoice;
  } catch (error) {
    // If Stripe keys are not configured, throw a more helpful error
    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      console.warn("Stripe keys not configured. Cannot create Stripe invoice.");
      throw new Error("Stripe is not configured. Invoice will be created locally.");
    }
    throw error;
  }
}

/**
 * Get invoices from a connected account
 */
export async function getInvoicesForConnectedAccount(
  accountId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const { getStripe } = await import("./stripe");
    const stripe = await getStripe();

    const invoices = await stripe.invoices.list(
      {
        limit,
        expand: ["data.customer"],
      },
      {
        stripeAccount: accountId,
      }
    );

    return invoices.data.map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.number || invoice.id,
      customerName:
        typeof invoice.customer === "object" && invoice.customer
          ? (invoice.customer.name || invoice.customer.email || "Unknown")
          : "Unknown",
      customerEmail:
        typeof invoice.customer === "object" && invoice.customer
          ? invoice.customer.email || ""
          : "",
      amount: invoice.amount_due / 100,
      status: invoice.status,
      dueDate: invoice.due_date,
      created: invoice.created,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    }));
  } catch (error) {
    // If Stripe keys are not configured or account doesn't exist, return empty array
    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      console.warn("Stripe keys not configured. Returning empty invoices for demo.");
      return [];
    }
    throw error;
  }
}

/**
 * Create a BACS Direct Debit mandate
 */
export async function createBacsMandate(
  accountId: string,
  params: {
    customerName: string;
    customerEmail: string;
    accountHolderName: string;
    sortCode: string;
    accountNumber: string;
    amount?: number;
    description?: string;
  }
): Promise<{
  customerId: string;
  paymentMethodId: string;
  mandateId: string;
  clientSecret?: string;
  setupUrl?: string;
}> {
  try {
    const { getStripe } = await import("./stripe");
    const stripe = await getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    // Create or retrieve customer
    const customers = await stripe.customers.list(
      {
        email: params.customerEmail,
        limit: 1,
      },
      {
        stripeAccount: accountId,
      }
    );

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create(
        {
          email: params.customerEmail,
          name: params.customerName,
        },
        {
          stripeAccount: accountId,
        }
      );
    }

    // Create BACS Direct Debit payment method
    const paymentMethod = await stripe.paymentMethods.create(
      {
        type: "bacs_debit",
        bacs_debit: {
          account_number: params.accountNumber.replace(/\s/g, ""),
          sort_code: params.sortCode.replace(/-/g, ""),
        },
        billing_details: {
          name: params.accountHolderName,
          email: params.customerEmail,
        },
      },
      {
        stripeAccount: accountId,
      }
    );

    // Attach payment method to customer
    await stripe.paymentMethods.attach(
      paymentMethod.id,
      {
        customer: customer.id,
      },
      {
        stripeAccount: accountId,
      }
    );

    // Create Setup Intent for mandate
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: customer.id,
        payment_method: paymentMethod.id,
        payment_method_types: ["bacs_debit"],
        payment_method_options: {
          bacs_debit: {
            mandate_options: {
              preferred_locale: "en-GB",
            },
          },
        },
        confirm: true,
        return_url: `${baseUrl}/payments?bacs_setup=success`,
      },
      {
        stripeAccount: accountId,
      }
    );

    // Retrieve the mandate from the setup intent
    let mandateId = "";
    if (setupIntent.payment_method && typeof setupIntent.payment_method === "object") {
      const pm = setupIntent.payment_method as any;
      if (pm.bacs_debit?.mandate) {
        mandateId = pm.bacs_debit.mandate;
      }
    }

    return {
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
      mandateId: mandateId || setupIntent.id,
      clientSecret: setupIntent.client_secret || undefined,
      setupUrl: setupIntent.next_action?.redirect_to_url?.url || undefined,
    };
  } catch (error) {
    // If Stripe keys are not configured, return mock data for demo
    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      console.warn("Stripe keys not configured. Using mock BACS mandate for demo.");
      return {
        customerId: `cus_demo_${Date.now()}`,
        paymentMethodId: `pm_demo_${Date.now()}`,
        mandateId: `mandate_demo_${Date.now()}`,
      };
    }
    throw error;
  }
}

