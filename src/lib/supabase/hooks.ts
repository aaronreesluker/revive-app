"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, useDemoMode } from "./client";
import type { Contact, Invoice, SalesLead, Review, Workflow } from "./types";
import { useAuth } from "@/context/AuthContext";

// Generic hook for fetching data with Supabase or falling back to localStorage
export function useSupabaseQuery<T>(
  tableName: string,
  localStorageKey: string,
  defaultData: T[] = []
) {
  const [data, setData] = useState<T[]>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isDemoMode = useDemoMode();

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: rows, error: fetchError } = await supabase
            .from(tableName)
            .select("*")
            .eq("tenant_id", user.tenantId)
            .order("created_at", { ascending: false });

          if (fetchError) throw fetchError;
          setData((rows as T[]) ?? []);
          setLoading(false);
          return;
        } catch (err) {
          console.warn(`Supabase fetch error for ${tableName}:`, err);
          setError(err instanceof Error ? err.message : "Failed to fetch data");
        }
      }
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch (err) {
      console.warn(`localStorage read error for ${localStorageKey}:`, err);
    }

    setLoading(false);
  }, [user, isDemoMode, tableName, localStorageKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, setData };
}

// Contacts hook
export function useContacts() {
  const { data, loading, error, refetch, setData } = useSupabaseQuery<Contact>(
    "contacts",
    "revive-contacts",
    []
  );
  const { user } = useAuth();
  const isDemoMode = useDemoMode();

  const createContact = useCallback(async (contact: Omit<Contact, "id" | "created_at" | "updated_at" | "tenant_id">) => {
    if (!user) return null;

    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: newContact, error } = await (supabase
          .from("contacts")
          .insert({ ...contact, tenant_id: user.tenantId } as any)
          .select()
          .single());

        if (error) throw error;
        refetch();
        return newContact;
      }
    }

    // Demo mode - save to localStorage
    const newContact = {
      ...contact,
      id: `contact-${Date.now()}`,
      tenant_id: user.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Contact;

    const updated = [newContact, ...data];
    setData(updated);
    localStorage.setItem("revive-contacts", JSON.stringify(updated));
    return newContact;
  }, [user, isDemoMode, data, refetch, setData]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await ((supabase as any)
          .from("contacts")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id));

        if (error) throw error;
        refetch();
        return;
      }
    }

    // Demo mode
    const updated = data.map((c) => 
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    );
    setData(updated);
    localStorage.setItem("revive-contacts", JSON.stringify(updated));
  }, [isDemoMode, data, refetch, setData]);

  const deleteContact = useCallback(async (id: string) => {
    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from("contacts").delete().eq("id", id);
        if (error) throw error;
        refetch();
        return;
      }
    }

    // Demo mode
    const updated = data.filter((c) => c.id !== id);
    setData(updated);
    localStorage.setItem("revive-contacts", JSON.stringify(updated));
  }, [isDemoMode, data, refetch, setData]);

  return {
    contacts: data,
    loading,
    error,
    refetch,
    createContact,
    updateContact,
    deleteContact,
  };
}

// Invoices hook
export function useInvoices() {
  const { data, loading, error, refetch, setData } = useSupabaseQuery<Invoice>(
    "invoices",
    "revive-invoices",
    []
  );
  const { user } = useAuth();
  const isDemoMode = useDemoMode();

  const createInvoice = useCallback(async (invoice: Omit<Invoice, "id" | "created_at" | "updated_at" | "tenant_id">) => {
    if (!user) return null;

    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: newInvoice, error } = await ((supabase as any)
          .from("invoices")
          .insert({ ...invoice, tenant_id: user.tenantId })
          .select()
          .single());

        if (error) throw error;
        refetch();
        return newInvoice;
      }
    }

    // Demo mode
    const newInvoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      tenant_id: user.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Invoice;

    const updated = [newInvoice, ...data];
    setData(updated);
    localStorage.setItem("revive-invoices", JSON.stringify(updated));
    return newInvoice;
  }, [user, isDemoMode, data, refetch, setData]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await ((supabase as any)
          .from("invoices")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id));

        if (error) throw error;
        refetch();
        return;
      }
    }

    // Demo mode
    const updated = data.map((inv) => 
      inv.id === id ? { ...inv, ...updates, updated_at: new Date().toISOString() } : inv
    );
    setData(updated);
    localStorage.setItem("revive-invoices", JSON.stringify(updated));
  }, [isDemoMode, data, refetch, setData]);

  return {
    invoices: data,
    loading,
    error,
    refetch,
    createInvoice,
    updateInvoice,
  };
}

// Sales Leads hook
export function useSalesLeadsDb() {
  const { data, loading, error, refetch, setData } = useSupabaseQuery<SalesLead>(
    "sales_leads",
    "revive-sales-leads",
    []
  );
  const { user } = useAuth();
  const isDemoMode = useDemoMode();

  const createLead = useCallback(async (lead: Omit<SalesLead, "id" | "created_at" | "updated_at" | "tenant_id">) => {
    if (!user) return null;

    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: newLead, error } = await ((supabase as any)
          .from("sales_leads")
          .insert({ ...lead, tenant_id: user.tenantId })
          .select()
          .single());

        if (error) throw error;
        refetch();
        return newLead;
      }
    }

    // Demo mode
    const newLead = {
      ...lead,
      id: `lead-${Date.now()}`,
      tenant_id: user.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as SalesLead;

    const updated = [newLead, ...data];
    setData(updated);
    localStorage.setItem("revive-sales-leads", JSON.stringify(updated));
    return newLead;
  }, [user, isDemoMode, data, refetch, setData]);

  const updateLead = useCallback(async (id: string, updates: Partial<SalesLead>) => {
    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await ((supabase as any)
          .from("sales_leads")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id));

        if (error) throw error;
        refetch();
        return;
      }
    }

    // Demo mode
    const updated = data.map((l) => 
      l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
    );
    setData(updated);
    localStorage.setItem("revive-sales-leads", JSON.stringify(updated));
  }, [isDemoMode, data, refetch, setData]);

  const deleteLead = useCallback(async (id: string) => {
    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from("sales_leads").delete().eq("id", id);
        if (error) throw error;
        refetch();
        return;
      }
    }

    // Demo mode
    const updated = data.filter((l) => l.id !== id);
    setData(updated);
    localStorage.setItem("revive-sales-leads", JSON.stringify(updated));
  }, [isDemoMode, data, refetch, setData]);

  return {
    leads: data,
    loading,
    error,
    refetch,
    createLead,
    updateLead,
    deleteLead,
  };
}

// Reviews hook
export function useReviews() {
  const { data, loading, error, refetch, setData } = useSupabaseQuery<Review>(
    "reviews",
    "revive-reviews",
    []
  );

  return {
    reviews: data,
    loading,
    error,
    refetch,
  };
}

// Workflows hook
export function useWorkflows() {
  const { data, loading, error, refetch, setData } = useSupabaseQuery<Workflow>(
    "workflows",
    "revive-workflows",
    []
  );
  const { user } = useAuth();
  const isDemoMode = useDemoMode();

  const createWorkflow = useCallback(async (workflow: Omit<Workflow, "id" | "created_at" | "updated_at" | "tenant_id">) => {
    if (!user) return null;

    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: newWorkflow, error } = await ((supabase as any)
          .from("workflows")
          .insert({ ...workflow, tenant_id: user.tenantId })
          .select()
          .single());

        if (error) throw error;
        refetch();
        return newWorkflow;
      }
    }

    // Demo mode
    const newWorkflow = {
      ...workflow,
      id: `workflow-${Date.now()}`,
      tenant_id: user.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Workflow;

    const updated = [newWorkflow, ...data];
    setData(updated);
    localStorage.setItem("revive-workflows", JSON.stringify(updated));
    return newWorkflow;
  }, [user, isDemoMode, data, refetch, setData]);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<Workflow>) => {
    if (!isDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await ((supabase as any)
          .from("workflows")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id));

        if (error) throw error;
        refetch();
        return;
      }
    }

    // Demo mode
    const updated = data.map((w) => 
      w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
    );
    setData(updated);
    localStorage.setItem("revive-workflows", JSON.stringify(updated));
  }, [isDemoMode, data, refetch, setData]);

  return {
    workflows: data,
    loading,
    error,
    refetch,
    createWorkflow,
    updateWorkflow,
  };
}
