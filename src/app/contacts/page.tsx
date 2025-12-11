"use client";

import dynamic from "next/dynamic";
import { AppShell } from "../../components/AppShell";
import { LoadingSpinner } from "../../components/LoadingSpinner";

const ContactsPage = dynamic(() => import("../../components/pages/ContactsPage").then((mod) => ({ default: mod.ContactsPage })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading contacts..." />
    </div>
  ),
  ssr: false,
});

export default function Contacts() {
  return (
    <AppShell>
      <ContactsPage />
    </AppShell>
  );
}

