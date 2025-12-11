"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "../AppShell";
import { ContactWorkspace } from "./ContactWorkspace";
import type { Contact, ContactProfile } from "../../data/contacts";

type ContactDetailClientProps = {
  contact: Contact | null;
  profile?: ContactProfile;
  contactId: string;
};

export function ContactDetailClient({ contact, profile, contactId }: ContactDetailClientProps) {
  const router = useRouter();

  return (
    <AppShell>
      {contact ? (
        <ContactWorkspace contactId={contactId} initialContact={contact} profile={profile} />
      ) : (
        <div
          className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm"
          style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}
        >
          Contact <span className="font-semibold" style={{ color: "var(--foreground)" }}>{contactId}</span> not found. Return to{" "}
          <button
            onClick={() => router.push("/contacts")}
            className="text-sky-300 underline-offset-2 hover:underline"
          >
            contacts
          </button>{" "}
          to pick another record.
        </div>
      )}
    </AppShell>
  );
}


