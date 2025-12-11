import { ContactDetailClient } from "../../../components/pages/ContactDetailClient";
import { mockContacts, contactProfiles } from "../../../data/contacts";

type ContactDetailProps = {
  params: { id: string };
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ContactDetail({ params, searchParams }: { params: ContactDetailProps["params"]; searchParams?: Promise<SearchParams> }) {
  const resolvedParams: ContactDetailProps["params"] =
    typeof (params as unknown as Promise<ContactDetailProps["params"]>)?.then === "function"
      ? await (params as unknown as Promise<ContactDetailProps["params"]>)
      : (params as ContactDetailProps["params"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (process.env.NODE_ENV !== "production") {
    console.log("[contact detail props]", resolvedParams);
  }

  const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;
  if (!rawId) {
    return <ContactDetailClient contactId="(missing)" contact={null} />;
  }

  const id = decodeURIComponent(rawId).trim();
  const source = typeof resolvedSearchParams?.source === "string" ? resolvedSearchParams.source : undefined;

  const contactsSource = source === "mock" ? mockContacts : mockContacts; // placeholder for future data hookups
  const profilesSource = source === "mock" ? contactProfiles : contactProfiles;

  const contact = contactsSource.find((item) => item.id === id);
  const profile = profilesSource[id];

  if (process.env.NODE_ENV !== "production") {
    console.log("[contact detail]", {
      id,
      contactsCount: contactsSource.length,
      hasContact: Boolean(contact),
      names: contactsSource.map((c) => c.id),
    });
  }

  return <ContactDetailClient contactId={id} contact={contact ?? null} profile={profile} />;
}

export async function generateStaticParams() {
  return mockContacts.map((contact) => ({
    id: contact.id,
  }));
}



