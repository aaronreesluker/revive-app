/**
 * Sync utilities for GoHighLevel ↔ Stripe integration
 * Handles bidirectional data synchronization between GHL and Stripe
 */

import { resolveGhlContext, fetchWithAuthRotation } from "../ghl/email";
import { getStripe } from "../stripe";
import type Stripe from "stripe";

/**
 * Sync Stripe Customer to GHL Contact
 */
export async function syncStripeCustomerToGhl(
  stripeCustomer: Stripe.Customer,
  locationId?: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const context = await resolveGhlContext({ locationId });

    if (!context.locationId) {
      return {
        success: false,
        error: "GHL Location ID is required. Set REVIVE_GHL_LOCATION_ID in .env.local",
      };
    }

    const contactsBase = `${context.versionedBaseUrl}/contacts`;
    const email = stripeCustomer.email || stripeCustomer.metadata?.email;

    if (!email) {
      return {
        success: false,
        error: "Stripe customer has no email address",
      };
    }

    // Search for existing contact
    const searchUrl = `${contactsBase}/search?locationId=${context.locationId}&email=${encodeURIComponent(email)}`;
    const searchResult = await fetchWithAuthRotation(context, searchUrl, { method: "GET" });

    let contactId: string | undefined;

    if (searchResult.status >= 200 && searchResult.status < 300) {
      try {
        const data = JSON.parse(searchResult.text);
        if (data?.contacts?.length) {
          contactId = data.contacts[0].id;
        }
      } catch (e) {
        console.error("Failed to parse GHL search response:", e);
      }
    }

    // Create or update contact
    const contactData: any = {
      email,
      firstName: stripeCustomer.name?.split(" ")[0] || email.split("@")[0] || "Customer",
      lastName: stripeCustomer.name?.split(" ").slice(1).join(" ") || "",
      phone: stripeCustomer.phone || "",
      customField: [
        { name: "Stripe Customer ID", value: stripeCustomer.id },
        { name: "Stripe Customer Since", value: new Date(stripeCustomer.created * 1000).toISOString() },
      ],
      tags: ["stripe-customer"],
    };

    if (contactId) {
      // Update existing contact
      const updateUrl = `${contactsBase}/${contactId}?locationId=${context.locationId}`;
      const updateResult = await fetchWithAuthRotation(context, updateUrl, {
        method: "PUT",
        body: JSON.stringify(contactData),
      });

      if (updateResult.status >= 200 && updateResult.status < 300) {
        return { success: true, contactId: contactId! };
      }
    } else {
      // Create new contact
      const createUrl = `${contactsBase}?locationId=${context.locationId}`;
      const createResult = await fetchWithAuthRotation(context, createUrl, {
        method: "POST",
        body: JSON.stringify(contactData),
      });

      if (createResult.status >= 200 && createResult.status < 300) {
        try {
          const data = JSON.parse(createResult.text);
          contactId = data?.contact?.id || data?.id;
          if (contactId) {
            return { success: true, contactId };
          }
        } catch (e) {
          console.error("Failed to parse GHL create response:", e);
        }
      }
    }

    return {
      success: false,
      error: "Failed to create or update GHL contact",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error syncing to GHL",
    };
  }
}

/**
 * Sync Stripe Invoice to GHL Opportunity
 */
export async function syncStripeInvoiceToGhl(
  stripeInvoice: Stripe.Invoice,
  locationId?: string
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  try {
    const context = await resolveGhlContext({ locationId });

    if (!context.locationId) {
      return {
        success: false,
        error: "GHL Location ID is required",
      };
    }

    // First, sync the customer to get contact ID
    const customerId = typeof stripeInvoice.customer === "string" ? stripeInvoice.customer : stripeInvoice.customer?.id;
    if (!customerId) {
      return { success: false, error: "Invoice has no customer" };
    }

    const stripe = await getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { success: false, error: "Customer has been deleted" };
    }

    const customerSync = await syncStripeCustomerToGhl(customer as Stripe.Customer, locationId);
    if (!customerSync.success || !customerSync.contactId) {
      return { success: false, error: customerSync.error || "Failed to sync customer" };
    }

    // Create or update opportunity in GHL
    const opportunitiesBase = `${context.versionedBaseUrl}/opportunities`;
    const amount = (stripeInvoice.amount_due || 0) / 100; // Convert from cents
    const currency = stripeInvoice.currency?.toUpperCase() || "GBP";

    const opportunityData: any = {
      locationId: context.locationId,
      contactId: customerSync.contactId,
      title: stripeInvoice.description || `Invoice ${stripeInvoice.number || stripeInvoice.id}`,
      monetaryValue: amount,
      pipelineId: stripeInvoice.status === "paid" ? "closed-won" : "open", // You'll need to map to actual pipeline IDs
      status: stripeInvoice.status === "paid" ? "Won" : "Open",
      customField: [
        { name: "Stripe Invoice ID", value: stripeInvoice.id },
        { name: "Invoice Number", value: stripeInvoice.number || stripeInvoice.id },
        { name: "Invoice Amount", value: `${currency} ${amount.toFixed(2)}` },
        { name: "Invoice Status", value: stripeInvoice.status },
        { name: "Due Date", value: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000).toISOString() : "" },
        { name: "Invoice URL", value: stripeInvoice.hosted_invoice_url || "" },
      ],
    };

    // Create opportunity
    const createUrl = `${opportunitiesBase}?locationId=${context.locationId}`;
    const createResult = await fetchWithAuthRotation(context, createUrl, {
      method: "POST",
      body: JSON.stringify(opportunityData),
    });

    if (createResult.status >= 200 && createResult.status < 300) {
      try {
        const data = JSON.parse(createResult.text);
        const opportunityId = data?.opportunity?.id || data?.id;
        return { success: true, opportunityId };
      } catch (e) {
        console.error("Failed to parse opportunity create response:", e);
        return {
          success: false,
          error: "Failed to parse GHL response",
        };
      }
    }

    return {
      success: false,
      error: `Failed to create opportunity: ${createResult.status} ${createResult.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error syncing invoice to GHL",
    };
  }
}

/**
 * Update GHL contact when Stripe payment succeeds
 */
export async function updateGhlOnPaymentSuccess(
  stripeInvoice: Stripe.Invoice,
  locationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await resolveGhlContext({ locationId });

    if (!context.locationId) {
      return { success: false, error: "GHL Location ID is required" };
    }

    // Get customer email
    const customerId = typeof stripeInvoice.customer === "string" ? stripeInvoice.customer : stripeInvoice.customer?.id;
    if (!customerId) {
      return { success: false, error: "Invoice has no customer" };
    }

    const stripe = await getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) {
      return { success: false, error: "Customer not found or has no email" };
    }

    // Find contact
    const contactsBase = `${context.versionedBaseUrl}/contacts`;
    const searchUrl = `${contactsBase}/search?locationId=${context.locationId}&email=${encodeURIComponent(customer.email)}`;
    const searchResult = await fetchWithAuthRotation(context, searchUrl, { method: "GET" });

    if (searchResult.status >= 200 && searchResult.status < 300) {
      const data = JSON.parse(searchResult.text);
      const contactId = data?.contacts?.[0]?.id;

      if (contactId) {
        // Add note/activity to contact timeline
        const amount = (stripeInvoice.amount_paid || 0) / 100;
        const note = `Payment received: ${stripeInvoice.currency?.toUpperCase()} ${amount.toFixed(2)} for Invoice ${stripeInvoice.number || stripeInvoice.id}`;

        // Add note via conversations API
        const noteUrl = `${context.versionedBaseUrl}/conversations/notes?locationId=${context.locationId}`;
        await fetchWithAuthRotation(context, noteUrl, {
          method: "POST",
          body: JSON.stringify({
            contactId,
            body: note,
          }),
        });

        // Update tags
        const updateUrl = `${contactsBase}/${contactId}?locationId=${context.locationId}`;
        await fetchWithAuthRotation(context, updateUrl, {
          method: "PUT",
          body: JSON.stringify({
            tags: ["stripe-customer", "paid-invoice"],
          }),
        });

        return { success: true };
      }
    }

    return { success: false, error: "Contact not found in GHL" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error updating GHL",
    };
  }
}

/**
 * Fetch GHL contacts and create Stripe customers
 */
export async function syncGhlContactsToStripe(
  locationId?: string
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  try {
    const context = await resolveGhlContext({ locationId });

    if (!context.locationId) {
      return { success: false, synced: 0, errors: ["GHL Location ID is required"] };
    }

    const stripe = await getStripe();
    const contactsBase = `${context.versionedBaseUrl}/contacts`;
    const contactsUrl = `${contactsBase}?locationId=${context.locationId}&limit=100`;

    const contactsResult = await fetchWithAuthRotation(context, contactsUrl, { method: "GET" });

    if (contactsResult.status < 200 || contactsResult.status >= 300) {
      return {
        success: false,
        synced: 0,
        errors: [`Failed to fetch GHL contacts: ${contactsResult.status}`],
      };
    }

    let contacts: any[] = [];
    try {
      const data = JSON.parse(contactsResult.text);
      contacts = data?.contacts || [];
    } catch (e) {
      return {
        success: false,
        synced: 0,
        errors: [`Failed to parse GHL contacts response: ${e instanceof Error ? e.message : "Unknown error"}`],
      };
    }

    let synced = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      if (!contact.email) continue;

      try {
        // Check if Stripe customer exists
        const existingCustomers = await stripe.customers.list({
          email: contact.email,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          // Update existing customer
          await stripe.customers.update(existingCustomers.data[0].id, {
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email,
            phone: contact.phone || undefined,
            metadata: {
              ghl_contact_id: contact.id,
              ghl_location_id: context.locationId,
            },
          });
        } else {
          // Create new Stripe customer
          await stripe.customers.create({
            email: contact.email,
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || undefined,
            phone: contact.phone || undefined,
            metadata: {
              ghl_contact_id: contact.id,
              ghl_location_id: context.locationId,
            },
          });
        }

        synced++;
      } catch (error) {
        errors.push(`Failed to sync ${contact.email}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { success: true, synced, errors };
  } catch (error) {
    return {
      success: false,
      synced: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

