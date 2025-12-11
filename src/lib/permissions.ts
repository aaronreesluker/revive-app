/**
 * Role-based access control (RBAC) system
 * Defines what each user role can access
 */

export type UserRole = "admin" | "sales";

export type Permission = 
  | "view_dashboard"
  | "view_contacts"
  | "view_workflows"
  | "view_reviews"
  | "view_payments"
  | "view_sales"
  | "view_insights"
  | "view_receptionist"
  | "view_assistant"
  | "view_settings"
  | "view_analytics"
  | "view_activity"
  | "edit_contacts"
  | "edit_workflows"
  | "edit_settings"
  | "manage_users"
  | "view_company_data"
  | "export_data";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    "view_dashboard",
    "view_contacts",
    "view_workflows",
    "view_reviews",
    "view_payments",
    "view_sales",
    "view_insights",
    "view_receptionist",
    "view_assistant",
    "view_settings",
    "view_analytics",
    "view_activity",
    "edit_contacts",
    "edit_workflows",
    "edit_settings",
    "manage_users",
    "view_company_data",
    "export_data",
  ],
  sales: [
    // Limited access - sales focused
    "view_dashboard",
    "view_contacts",
    "view_sales",
    "view_reviews",
    "view_payments", // Can view their own sales revenue
    "view_assistant", // Can access sales-focused AI assistant
    "edit_contacts", // Can edit contacts they create
    "export_data", // Can export sales data
    // No access to:
    // - Workflows (company automation)
    // - Insights (company analytics)
    // - Receptionist (company operations)
    // - Settings (company configuration)
    // - Analytics (company metrics)
    // - Activity (company activity logs)
    // - Company data (sensitive information)
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Check if a role can access a specific route/page
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission> = {
    "/": "view_dashboard",
    "/dashboard": "view_dashboard",
    "/contacts": "view_contacts",
    "/workflows": "view_workflows",
    "/reviews": "view_reviews",
    "/payments": "view_payments",
    "/sales": "view_sales",
    "/insights": "view_insights",
    "/receptionist": "view_receptionist",
    "/assistant": "view_assistant",
    "/settings": "view_settings",
    "/analytics": "view_analytics",
    "/activity": "view_activity",
  };

  const permission = routePermissions[route];
  if (!permission) {
    // Unknown routes default to admin-only for safety
    return role === "admin";
  }

  return hasPermission(role, permission);
}

/**
 * Check if a role can view company/sensitive data
 */
export function canViewCompanyData(role: UserRole): boolean {
  return hasPermission(role, "view_company_data");
}

