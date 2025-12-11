"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccessRoute } from "@/lib/permissions";
import type { UserRole } from "@/lib/auth-demo";

/**
 * Component to protect routes based on user role
 * Redirects to dashboard if user doesn't have permission
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [tempRoleOverride, setTempRoleOverride] = useState<UserRole | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("revive-temp-role-override");
      if (stored === "admin" || stored === "sales") {
        setTempRoleOverride(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    // Use temp role override if set, otherwise use actual role
    const effectiveRole = tempRoleOverride || user.role;

    // Check if user can access current route
    if (!canAccessRoute(effectiveRole, pathname || "/")) {
      // Redirect to dashboard if no permission
      router.replace("/");
    }
  }, [user, loading, router, pathname, tempRoleOverride]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface)]">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
          Checking access...
        </div>
      </div>
    );
  }

  // Use temp role override if set, otherwise use actual role
  const effectiveRole = tempRoleOverride || user.role;

  // Check permission one more time before rendering
  if (!canAccessRoute(effectiveRole, pathname || "/")) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface)]">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
          You don't have permission to access this page.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

