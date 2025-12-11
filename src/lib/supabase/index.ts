// Supabase client exports
export { createClient, getSupabaseClient, isSupabaseConfigured, useDemoMode } from "./client";
export { createServerSupabaseClient, createAdminClient } from "./server";

// Types
export type {
  Database,
  Profile,
  Contact,
  Invoice,
  SalesLead,
  Review,
  Workflow,
  ActivityLog,
  BacsMandate,
} from "./types";

// Hooks
export {
  useSupabaseQuery,
  useContacts,
  useInvoices,
  useSalesLeadsDb,
  useReviews,
  useWorkflows,
} from "./hooks";
