"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

// Default labels for common routes
const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "contacts": "Contacts",
  "workflows": "Workflows",
  "reviews": "Reviews",
  "payments": "Payments",
  "sales": "Sales",
  "insights": "Insights",
  "receptionist": "Receptionist",
  "assistant": "Assistant",
  "settings": "Settings",
  "analytics": "Analytics",
  "invoices": "Invoices",
  "notifications": "Notifications",
  "activity": "Activity",
};

export function Breadcrumbs({ items, showHome = true, className }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbs: BreadcrumbItem[] = items ?? (() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label = routeLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
      return { label, href };
    });
  })();

  if (breadcrumbs.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      {showHome && (
        <>
          <Link
            href="/"
            className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/10"
            style={{ color: pathname === "/" ? "var(--brand)" : "color-mix(in oklab, var(--foreground), transparent 50%)" }}
          >
            <Home size={14} />
            <span className="hidden sm:inline">Home</span>
          </Link>
          {breadcrumbs.length > 0 && (
            <ChevronRight size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 70%)" }} />
          )}
        </>
      )}
      
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={item.href} className="flex items-center gap-1">
            {isLast ? (
              <span 
                className="px-2 py-1 font-medium"
                style={{ color: "var(--foreground)" }}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <>
                <Link
                  href={item.href}
                  className="rounded-md px-2 py-1 transition-colors hover:bg-white/10"
                  style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}
                >
                  {item.label}
                </Link>
                <ChevronRight size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 70%)" }} />
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}


