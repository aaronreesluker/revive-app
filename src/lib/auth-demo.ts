export type UserRole = "admin" | "sales";

export interface DemoUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  password: string;
  tenantId: string;
  mfaEnabled: boolean;
  mfaCode?: string;
}

// NOTE: Demo-only users. Replace with a real identity provider or database.
export const demoUsers: DemoUser[] = [
  {
    id: "user-admin-aaron",
    email: "aaron@revivemarketing.uk",
    phone: "+447700900001",
    name: "Aaron",
    role: "admin",
    tenantId: "demo-agency",
    password: "Revive!2024",
    mfaEnabled: false,
  },
  {
    id: "user-admin-luke",
    email: "luke@revivemarketing.uk",
    phone: "+447700900002",
    name: "Luke",
    role: "admin",
    tenantId: "demo-agency",
    password: "Revive!2024",
    mfaEnabled: false,
  },
  {
    id: "user-sales-1",
    email: "sales1@revive.ai",
    phone: "+447700900101",
    name: "Sales Rep 1",
    role: "sales",
    tenantId: "demo-agency",
    password: "Revive!2024",
    mfaEnabled: false,
  },
  {
    id: "user-sales-2",
    email: "sales2@revive.ai",
    phone: "+447700900102",
    name: "Sales Rep 2",
    role: "sales",
    tenantId: "demo-agency",
    password: "Revive!2024",
    mfaEnabled: false,
  },
  // Legacy demo users (mapped to admin for backward compatibility)
  {
    id: "user-demo-owner",
    email: "demo@revive.ai",
    phone: "+447700900123",
    name: "Demo Agency Owner",
    role: "admin",
    tenantId: "demo-agency",
    password: "Revive!2024",
    mfaEnabled: true,
    mfaCode: "246810",
  },
  {
    id: "user-demo-manager",
    email: "sarah@revive.ai",
    phone: "+447700900124",
    name: "Sarah Williams",
    role: "admin",
    tenantId: "demo-agency",
    password: "Revive!2024",
    mfaEnabled: false,
  },
];

export function findDemoUserByEmail(email: string) {
  return demoUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}


