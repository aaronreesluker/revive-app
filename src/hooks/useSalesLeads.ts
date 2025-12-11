/**
 * Custom hook for managing sales leads data
 */

import { useState, useEffect, useCallback } from "react";
import type { SalesLead, LeadStatus } from "@/types/sales";

const STORAGE_KEY = "revive-sales-leads";

function loadSalesLeads(): SalesLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSalesLeads(leads: SalesLead[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // ignore storage errors
  }
}

export function useSalesLeads() {
  const [leads, setLeads] = useState<SalesLead[]>(() => loadSalesLeads());

  useEffect(() => {
    saveSalesLeads(leads);
    // Sync to server for AI access
    fetch("/api/sales/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads }),
    }).catch((err) => console.warn("Failed to sync sales leads:", err));
  }, [leads]);

  const addLead = useCallback((lead: SalesLead) => {
    setLeads((prev) => [...prev, lead]);
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<SalesLead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: Date.now() } : l))
    );
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setLeadsDirect = useCallback((newLeads: SalesLead[]) => {
    setLeads(newLeads);
  }, []);

  return {
    leads,
    setLeads: setLeadsDirect,
    addLead,
    updateLead,
    deleteLead,
  };
}


