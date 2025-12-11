"use client";

import { useCallback, useMemo, useState } from "react";
import type { Contact } from "@/data/contacts";
import { mockContacts } from "@/data/contacts";

type ContactDirectoryState = {
  contacts: Contact[];
};

const STORAGE_KEY = "revive-contact-directory";

function loadStoredContacts(): ContactDirectoryState {
  if (typeof window === "undefined") return { contacts: mockContacts };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { contacts: mockContacts };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.contacts)) {
      return { contacts: mockContacts };
    }
    const contacts = parsed.contacts as Contact[];
    if (!contacts.length) return { contacts: mockContacts };
    return { contacts };
  } catch {
    return { contacts: mockContacts };
  }
}

function persistContacts(contacts: Contact[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ contacts }));
  } catch {
    // ignore storage errors
  }
}

export function useContactDirectory() {
  const [state, setState] = useState<ContactDirectoryState>(() => loadStoredContacts());

  const contacts = useMemo(() => state.contacts, [state.contacts]);

  const updateContact = useCallback(async (id: string, nextContact: Contact) => {
    setState((prev) => {
      const nextContacts = prev.contacts.map((entry) => (entry.id === id ? nextContact : entry));
      persistContacts(nextContacts);
      return { contacts: nextContacts };
    });
    return nextContact;
  }, []);

  const getStageOptions = useCallback(() => {
    const defaults = ["New Lead", "Qualified", "Booked", "Customer", "Dormant"];
    const extracted = Array.from(new Set(contacts.map((contact) => contact.stage))).filter(Boolean);
    return Array.from(new Set([...defaults, ...extracted]));
  }, [contacts]);

  const getSourceOptions = useCallback(() => {
    const defaults = ["Website", "Referral", "Paid Ads", "Outbound", "Event"];
    const extracted = Array.from(new Set(contacts.map((contact) => contact.source))).filter(Boolean);
    return Array.from(new Set([...defaults, ...extracted]));
  }, [contacts]);

  const getOwnerOptions = useCallback(() => {
    const extracted = Array.from(new Set(contacts.map((contact) => contact.owner).filter(Boolean))) as string[];
    const defaults = ["Alice Shaw", "Ethan Miller", "Priya Kendre", "Jordan Blake"];
    return Array.from(new Set([...defaults, ...extracted]));
  }, [contacts]);

  const timezoneOptions = useMemo(() => {
    const defaults = [
      { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
      { value: "America/Denver", label: "America/Denver (MT)" },
      { value: "America/Chicago", label: "America/Chicago (CT)" },
      { value: "America/New_York", label: "America/New_York (ET)" },
      { value: "Europe/London", label: "Europe/London (GMT/BST)" },
      { value: "Europe/Paris", label: "Europe/Paris (CET)" },
      { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
      { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
      { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
      { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
    ];
    const extracted = Array.from(new Set(contacts.map((contact) => contact.timezone).filter(Boolean))) as string[];
    const merged = [
      ...defaults,
      ...extracted.map((tz) => ({
        value: tz,
        label: defaults.find((option) => option.value === tz)?.label ?? tz,
      })),
    ];
    const deduped: { [key: string]: { value: string; label: string } } = {};
    merged.forEach((option) => {
      deduped[option.value] = option;
    });
    return Object.values(deduped);
  }, [contacts]);

  const findContact = useCallback(
    (id: string) => contacts.find((contact) => contact.id === id) ?? null,
    [contacts]
  );

  const addContact = useCallback((contact: Contact) => {
    setState((prev) => {
      // Check if contact already exists (by phone or email)
      const exists = prev.contacts.some(
        (c) => c.phone === contact.phone || c.email === contact.email
      );
      if (exists) {
        // Update existing contact instead
        const nextContacts = prev.contacts.map((c) =>
          c.phone === contact.phone || c.email === contact.email ? contact : c
        );
        persistContacts(nextContacts);
        return { contacts: nextContacts };
      }
      const nextContacts = [...prev.contacts, contact];
      persistContacts(nextContacts);
      return { contacts: nextContacts };
    });
    return contact;
  }, []);

  return {
    contacts,
    updateContact,
    addContact,
    findContact,
    getStageOptions,
    getSourceOptions,
    getOwnerOptions,
    timezoneOptions,
  };
}


