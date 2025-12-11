/**
 * Storage for Stripe Connect account IDs per tenant
 * 
 * In production, this should be stored in your database.
 * For demo, we use localStorage.
 */

const STORAGE_KEY_PREFIX = "revive-stripe-connect-";

export type StripeConnectAccount = {
  accountId: string;
  email: string;
  detailsSubmitted: boolean;
  connectedAt: number;
  tenantId: string;
};

/**
 * Get Stripe Connect account for a tenant
 */
export function getStripeConnectAccount(tenantId: string): StripeConnectAccount | null {
  if (typeof window === "undefined") return null;

  try {
    const key = `${STORAGE_KEY_PREFIX}${tenantId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const account = JSON.parse(stored) as StripeConnectAccount;
    return account;
  } catch (error) {
    console.error("Error loading Stripe Connect account:", error);
    return null;
  }
}

/**
 * Save Stripe Connect account for a tenant
 */
export function saveStripeConnectAccount(
  tenantId: string,
  account: Omit<StripeConnectAccount, "tenantId" | "connectedAt">
): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_KEY_PREFIX}${tenantId}`;
    const accountData: StripeConnectAccount = {
      ...account,
      tenantId,
      connectedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(accountData));
  } catch (error) {
    console.error("Error saving Stripe Connect account:", error);
  }
}

/**
 * Remove Stripe Connect account for a tenant
 */
export function removeStripeConnectAccount(tenantId: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_KEY_PREFIX}${tenantId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing Stripe Connect account:", error);
  }
}

