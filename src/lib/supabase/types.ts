/**
 * Database types for Supabase
 * 
 * These types define the structure of your database tables.
 * After creating your Supabase project, you can generate these automatically:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Users/Profiles table
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          role: "admin" | "sales";
          tenant_id: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          role?: "admin" | "sales";
          tenant_id: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          phone?: string | null;
          role?: "admin" | "sales";
          tenant_id?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };

      // Contacts table
      contacts: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          stage: string;
          source: string | null;
          lifetime_value: number;
          tags: string[];
          notes: string | null;
          ghl_contact_id: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          stage?: string;
          source?: string | null;
          lifetime_value?: number;
          tags?: string[];
          notes?: string | null;
          ghl_contact_id?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          stage?: string;
          source?: string | null;
          lifetime_value?: number;
          tags?: string[];
          notes?: string | null;
          ghl_contact_id?: string | null;
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
      };

      // Invoices/Payments table
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string | null;
          invoice_number: string;
          customer_name: string;
          customer_email: string | null;
          amount: number;
          currency: string;
          status: "draft" | "open" | "paid" | "void" | "uncollectible";
          due_date: string | null;
          paid_at: string | null;
          stripe_invoice_id: string | null;
          stripe_payment_link: string | null;
          items: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id?: string | null;
          invoice_number: string;
          customer_name: string;
          customer_email?: string | null;
          amount: number;
          currency?: string;
          status?: "draft" | "open" | "paid" | "void" | "uncollectible";
          due_date?: string | null;
          paid_at?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payment_link?: string | null;
          items?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          contact_id?: string | null;
          invoice_number?: string;
          customer_name?: string;
          customer_email?: string | null;
          amount?: number;
          currency?: string;
          status?: "draft" | "open" | "paid" | "void" | "uncollectible";
          due_date?: string | null;
          paid_at?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payment_link?: string | null;
          items?: Json;
          updated_at?: string;
        };
      };

      // Sales Leads table
      sales_leads: {
        Row: {
          id: string;
          tenant_id: string;
          assigned_to: string | null;
          business_name: string;
          industry: string | null;
          contact_number: string | null;
          current_price: number;
          status: string;
          price_sold_at: number | null;
          upsell_amount: number | null;
          upsell_description: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assigned_to?: string | null;
          business_name: string;
          industry?: string | null;
          contact_number?: string | null;
          current_price?: number;
          status?: string;
          price_sold_at?: number | null;
          upsell_amount?: number | null;
          upsell_description?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          business_name?: string;
          industry?: string | null;
          contact_number?: string | null;
          current_price?: number;
          status?: string;
          price_sold_at?: number | null;
          upsell_amount?: number | null;
          upsell_description?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };

      // Reviews table
      reviews: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string | null;
          contact_name: string;
          platform: string;
          rating: number;
          review_text: string | null;
          response_text: string | null;
          responded_at: string | null;
          review_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id?: string | null;
          contact_name: string;
          platform?: string;
          rating: number;
          review_text?: string | null;
          response_text?: string | null;
          responded_at?: string | null;
          review_date?: string;
          created_at?: string;
        };
        Update: {
          contact_name?: string;
          platform?: string;
          rating?: number;
          review_text?: string | null;
          response_text?: string | null;
          responded_at?: string | null;
          review_date?: string;
        };
      };

      // Workflows table
      workflows: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          trigger: string;
          actions: Json;
          is_active: boolean;
          last_triggered_at: string | null;
          trigger_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          trigger: string;
          actions?: Json;
          is_active?: boolean;
          last_triggered_at?: string | null;
          trigger_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          trigger?: string;
          actions?: Json;
          is_active?: boolean;
          last_triggered_at?: string | null;
          trigger_count?: number;
          updated_at?: string;
        };
      };

      // Activity log table
      activity_log: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          category: string;
          action: string;
          summary: string;
          severity: "info" | "warning" | "error" | "success";
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          category: string;
          action: string;
          summary: string;
          severity?: "info" | "warning" | "error" | "success";
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
      };

      // BACS Mandates table
      bacs_mandates: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string | null;
          customer_name: string;
          customer_email: string;
          mandate_reference: string;
          status: "pending" | "active" | "cancelled" | "failed";
          stripe_mandate_id: string | null;
          stripe_customer_id: string | null;
          stripe_payment_method_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id?: string | null;
          customer_name: string;
          customer_email: string;
          mandate_reference: string;
          status?: "pending" | "active" | "cancelled" | "failed";
          stripe_mandate_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_payment_method_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_name?: string;
          customer_email?: string;
          status?: "pending" | "active" | "cancelled" | "failed";
          stripe_mandate_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_payment_method_id?: string | null;
          updated_at?: string;
        };
      };

      // Pending Signups table
      pending_signups: {
        Row: {
          id: string;
          email: string;
          name: string;
          company: string | null;
          phone: string | null;
          reason: string | null;
          status: "pending" | "approved" | "rejected";
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          company?: string | null;
          phone?: string | null;
          reason?: string | null;
          status?: "pending" | "approved" | "rejected";
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string;
          company?: string | null;
          phone?: string | null;
          reason?: string | null;
          status?: "pending" | "approved" | "rejected";
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "sales";
      invoice_status: "draft" | "open" | "paid" | "void" | "uncollectible";
      mandate_status: "pending" | "active" | "cancelled" | "failed";
      log_severity: "info" | "warning" | "error" | "success";
    };
  };
}

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type SalesLead = Database["public"]["Tables"]["sales_leads"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Workflow = Database["public"]["Tables"]["workflows"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
export type BacsMandate = Database["public"]["Tables"]["bacs_mandates"]["Row"];
export type PendingSignup = Database["public"]["Tables"]["pending_signups"]["Row"];
