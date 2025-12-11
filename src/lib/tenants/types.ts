/**
 * Tenant (Business/Company) and User management types.
 * 
 * Architecture:
 * - Tenant = Business/Company (e.g., "Company A")
 * - Users belong to a tenant (e.g., admin + 2 users in Company A)
 * - Token pool is SHARED at tenant level
 * - All users in the same tenant share the same token pool
 */

export type Tenant = {
  id: string; // tenantId
  name: string;
  planId: "lite" | "core" | "growth";
  createdAt: number;
  // Token pool (shared by all users)
  tokenPool: {
    baseAllowance: number; // From plan
    usedTokens: number; // Total used by all users
    purchasedTokens: number; // Add-ons
    rolloverTokens: number;
  };
  // User management
  users: TenantUser[];
  // Joint Token Collective
  jointTokenCollective: {
    enabled: boolean;
    additionalUsers: number; // Users added via Joint Token Collective
    pricePerUser: number; // £50/month per additional user
  };
};

export type TenantUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  tenantId: string;
  createdAt: number;
};

/**
 * Example:
 * 
 * Tenant: {
 *   id: "company-a",
 *   name: "ABC Plumbing",
 *   planId: "core",
 *   tokenPool: {
 *     baseAllowance: 75000, // From Core plan
 *     usedTokens: 25000, // Used by all 3 users combined
 *     purchasedTokens: 0,
 *     rolloverTokens: 0
 *   },
 *   users: [
 *     { id: "user-1", email: "admin@abc.com", role: "admin", tenantId: "company-a" },
 *     { id: "user-2", email: "john@abc.com", role: "user", tenantId: "company-a" },
 *     { id: "user-3", email: "sarah@abc.com", role: "user", tenantId: "company-a" }
 *   ],
 *   jointTokenCollective: {
 *     enabled: true,
 *     additionalUsers: 1, // Added 4th user for £50/month
 *     pricePerUser: 50
 *   }
 * }
 * 
 * All 4 users share the same 75,000 token pool.
 */

