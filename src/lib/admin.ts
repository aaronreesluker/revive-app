// Admin email addresses that can approve signups
export const ADMIN_EMAILS = [
  "aaron@revivemarketing.uk",
  "luke@revivemarketing.uk",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as any);
}
