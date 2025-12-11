"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Users, Workflow, Star, CreditCard, Bot, Settings as SettingsIcon, ChevronLeft, ChevronRight, Phone, PoundSterling, LogOut, Lightbulb, ArrowUpRight, TrendingUp, Bell, Sparkles, BarChart3 } from "lucide-react";
import { MobileNav } from "./MobileNav";
import { loadConfig } from "../lib/config";
import { isModuleEnabled, getPoweredByText } from "../lib/config-server";
import type { AppConfig } from "../lib/config-types";
import { cn } from "../lib/utils";
import { DesktopFrame } from "./DesktopFrame";
import { TierProvider } from "../context/TierContext";
import { TokenProvider } from "../context/TokenContext";
import { OperationsProvider } from "../context/OperationsContext";
import { Button } from "./Button";
import { useAuth } from "../context/AuthContext";
import { notificationFeed } from "../lib/notifications";
import { isAdminEmail } from "../lib/admin";
import { useEventLog } from "../context/EventLogContext";
import { useCurrentPlan } from "../hooks/usePlanFeatures";
import { canAccessRoute, canViewCompanyData } from "../lib/permissions";
import type { UserRole } from "../lib/auth-demo";

export type AppTab =
  | "Dashboard"
  | "Contacts"
  | "Workflows"
  | "Reviews"
  | "Payments"
  | "Sales"
  | "Insights"
  | "Receptionist"
  | "Settings"
  | "Assistant";

const navItems: { key: AppTab; label: string; icon: ReactNode; module: keyof AppConfig["modules"] }[] = [
  { key: "Dashboard", label: "Dashboard", icon: <LayoutGrid size={16} />, module: "overview" },
  { key: "Contacts", label: "Contacts", icon: <Users size={16} />, module: "contacts" },
  { key: "Workflows", label: "Workflows", icon: <Workflow size={16} />, module: "workflows" },
  { key: "Reviews", label: "Reviews", icon: <Star size={16} />, module: "reviews" },
  { key: "Payments", label: "Payments", icon: <CreditCard size={16} />, module: "payments" },
  { key: "Sales", label: "Sales", icon: <BarChart3 size={16} />, module: "payments" },
  { key: "Insights", label: "Insights", icon: <Bot size={16} />, module: "insights" },
  { key: "Receptionist", label: "Receptionist", icon: <Phone size={16} />, module: "receptionist" },
  { key: "Assistant", label: "Assistant", icon: <Sparkles size={16} />, module: "insights" },
  { key: "Settings", label: "Settings", icon: <SettingsIcon size={16} />, module: "settings" },
];

type SidebarInsight = {
  id: string;
  title: string;
  subtitle: string;
  helper?: string;
  icon: ReactNode;
  iconClassName?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
  route?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  details: string;
  timestamp: string;
  read?: boolean;
  category?: "payments" | "tokens" | "workflows" | "general";
  actionLabel?: string;
  actionRoute?: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  // Tier system removed - always use core tier
  const activeTier = "core" as const;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [leftEdgeHovered, setLeftEdgeHovered] = useState(false);
  const sidebarHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationListRef = useRef<HTMLDivElement | null>(null);
  const [insightIndex, setInsightIndex] = useState(0);
  const [showLoginSplash, setShowLoginSplash] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [recentTabs, setRecentTabs] = useState<AppTab[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    notificationFeed.map((item) => ({
      ...item,
      actionRoute: item.actionRoute ?? `/notifications?notification=${item.id}`,
    }))
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tempRoleOverride, setTempRoleOverride] = useState<UserRole | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const { recordEvent } = useEventLog();
  const { features } = useCurrentPlan();

  useEffect(() => {
    loadConfig("/config.json").then(setConfig);
    try {
      const stored = localStorage.getItem("revive-theme");
      if (stored === "light" || stored === "dark") setTheme(stored);
      const storedCollapsed = localStorage.getItem("revive-sidebar-collapsed");
      if (storedCollapsed === "true") setSidebarCollapsed(true);
      const storedRoleOverride = localStorage.getItem("revive-temp-role-override");
      if (storedRoleOverride === "admin" || storedRoleOverride === "sales") {
        setTempRoleOverride(storedRoleOverride);
      }
    } catch {
      // ignore theme persistence errors
    }
    // Tier system removed - no longer loading from localStorage
    try {
      const storedRecent = localStorage.getItem("revive-recent-tabs");
      if (storedRecent) {
        const parsed = JSON.parse(storedRecent);
        if (Array.isArray(parsed)) {
          const validTabs = parsed.filter(
            (tab: unknown): tab is AppTab =>
              typeof tab === "string" && (tab === "Dashboard" || navItems.some((item) => item.key === tab))
          );
          setRecentTabs(validTabs.filter((tab) => tab !== "Dashboard").slice(0, 6));
        }
      }
    } catch {}
    try {
      if (sessionStorage.getItem("revive-just-logged-in") === "1") {
        setShowLoginSplash(true);
        setLoginProgress(0);
        sessionStorage.removeItem("revive-just-logged-in");
        window.setTimeout(() => setShowLoginSplash(false), 1200);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!showLoginSplash) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1100; // ms
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setLoginProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showLoginSplash]);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login");
    }
  }, [authLoading, authUser, router]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickAway = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [notificationsOpen]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    localStorage.setItem("revive-sidebar-collapsed", sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const listNode = notificationListRef.current;
    const focusable = listNode?.querySelector<HTMLButtonElement>(".notification-item");
    focusable?.focus();
  }, [notificationsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrubDevtools = () => {
      document.querySelectorAll("nextjs-portal").forEach((node) => {
        const host = node as HTMLElement;
        if (!host) return;
        let removePortal = false;
        if (host.shadowRoot) {
          const btn = Array.from(host.shadowRoot.querySelectorAll("button[aria-label]")).find((el) => {
            const label = el.getAttribute("aria-label") || "";
            return label.toLowerCase().includes("devtools");
          });
          if (btn) removePortal = true;
        }
        if (removePortal) {
          host.remove();
        }
      });
      document.querySelectorAll("button[aria-label]").forEach((el) => {
        const label = el.getAttribute("aria-label") || "";
        if (label.toLowerCase().includes("devtools")) {
          el.parentElement?.removeChild(el);
        }
      });
    };

    scrubDevtools();
    const observer = new MutationObserver(scrubDevtools);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(scrubDevtools, 400);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 8000);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  // Tier system removed - no longer persisting to localStorage

  // Tier management removed - always use core tier
  const handleTierChange = useCallback(() => {
    // No-op: tier switching disabled
  }, []);

  const resetTierPreview = useCallback(() => {
    // No-op: tier switching disabled
  }, []);

  const goToTier = useCallback(() => {
    // No-op: tier switching disabled
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      setNotifications((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
      setNotificationsOpen(false);
      const route = item.actionRoute ?? `/notifications?notification=${item.id}`;
      router.push(route);
    },
    [router]
  );

  const tierContextValue = useMemo(
    () => ({
      tier: "core" as const,
      setTier: handleTierChange,
      resetTierPreview,
      storageError: null,
    }),
    [handleTierChange, resetTierPreview]
  );

  const effectiveRole: UserRole | null = authUser ? tempRoleOverride || authUser.role : null;

  const sidebarInsights = useMemo<SidebarInsight[]>(() => {
    const items: SidebarInsight[] = [];

    // Simplified insights without tier promotions
    items.push(
      {
        id: "workflows",
        title: "Automate your workflows",
        subtitle: "Set up custom automations to streamline your operations.",
        icon: <Workflow size={12} />,
        iconClassName: "text-purple-300",
        route: "/workflows",
      },
      {
        id: "analytics",
        title: "Track your performance",
        subtitle: "Monitor tokens, analytics, and insights to optimize your usage.",
        icon: <TrendingUp size={12} />,
        iconClassName: "text-emerald-300",
        route: "/analytics/tokens",
      },
      {
        id: "receptionist",
        title: "AI receptionist",
        subtitle: "Never miss a lead with 24/7 automated call and SMS handling.",
        icon: <Phone size={12} />,
        iconClassName: "text-blue-300",
        route: "/receptionist",
      }
    );

    const fallback: SidebarInsight[] = [
      {
        id: "global-token-efficiency",
        title: "Token efficiency playbook",
        subtitle: "Blend AI workflows with human handoffs to squeeze more value from every pack.",
        icon: <Lightbulb size={12} />,
        iconClassName: "text-amber-200",
        route: "/analytics/tokens",
      },
      {
        id: "global-review-loop",
        title: "Review-to-referral loop",
        subtitle: "Drop a pre-built automation into idle accounts to turn reviews into new revenue.",
        icon: <Star size={12} />,
        iconClassName: "text-fuchsia-300",
        route: "/workflows",
      },
      {
        id: "global-ai-receptionist",
        title: "AI receptionist spotlight",
        subtitle: "Layer SMS hand-offs when wait times spike to protect your SLA.",
        icon: <Phone size={12} />,
        iconClassName: "text-emerald-300",
        route: "/receptionist",
      },
    ];

    let fallbackIndex = 0;
    while (items.length < 3) {
      const base = fallback[fallbackIndex % fallback.length];
      items.push({ ...base, id: `${base.id}-${fallbackIndex}` });
      fallbackIndex += 1;
    }

    return items.slice(0, Math.max(3, items.length));
  }, []);

  useEffect(() => {
    if (sidebarInsights.length <= 1 || sidebarCollapsed) return;
    const id = window.setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % sidebarInsights.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [sidebarCollapsed, sidebarInsights.length]);

  const handleInsightStep = useCallback(
    (delta: number) => {
      if (sidebarInsights.length === 0) return;
      setInsightIndex((prev) => (prev + delta + sidebarInsights.length) % sidebarInsights.length);
    },
    [sidebarInsights.length]
  );

  const currentInsight = sidebarInsights.length ? sidebarInsights[insightIndex % sidebarInsights.length] : null;

  const getActiveTab = (): AppTab => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const primary = segments[0] ?? "";
    if (primary === "" || primary === "overview" || primary === "dashboard") return "Dashboard";
    return (primary.charAt(0).toUpperCase() + primary.slice(1)) as AppTab;
  };

  const activeTab = getActiveTab();

  // Track high-level navigation to understand which areas of the app are used most
  useEffect(() => {
    if (!authUser) return;
    recordEvent({
      category: "system",
      action: "navigation",
      summary: `Viewed ${activeTab} page`,
      meta: {
        tab: activeTab,
        pathname,
        role: effectiveRole ?? authUser.role,
      },
    });
  }, [activeTab, authUser, effectiveRole, pathname, recordEvent]);

  useEffect(() => {
    if (!config || authLoading) return;
    setRecentTabs((prev) => {
      if (!activeTab || activeTab === "Dashboard") {
        try {
          localStorage.setItem("revive-recent-tabs", JSON.stringify(prev));
        } catch {}
        return prev;
      }
      const filtered = prev.filter((tab) => tab !== activeTab);
      const next = [activeTab, ...filtered];
      const deduped = next
        .filter((tab, index) => next.indexOf(tab) === index && tab !== "Dashboard")
        .slice(0, 6);
      try {
        localStorage.setItem("revive-recent-tabs", JSON.stringify(deduped));
      } catch {}
      return deduped;
    });
  }, [activeTab, authLoading, config]);

  // Fetch pending signups and add as notifications for admins
  useEffect(() => {
    if (!authUser || authLoading) return;
    const isAdmin = authUser.role === "admin" || isAdminEmail(authUser.email);
    if (!isAdmin) return;

    const fetchPendingSignups = async () => {
      try {
        const response = await fetch("/api/signup/pending");
        const data = await response.json();
        if (data.success && data.pendingSignups) {
          // Create notifications for pending signups
          const signupNotifications: NotificationItem[] = data.pendingSignups.map((signup: any) => ({
            id: `signup-${signup.id}`,
            title: "New Account Request",
            message: `${signup.name} (${signup.email}) requested access`,
            timestamp: new Date(signup.created_at).toLocaleString(),
            read: false,
            category: "general" as const,
            actionLabel: "Review in Settings",
            actionRoute: "/settings",
          }));

          // Merge with existing notifications, removing old signup notifications first
          setNotifications((prev) => {
            const filtered = prev.filter((n) => !n.id.startsWith("signup-"));
            return [...signupNotifications, ...filtered];
          });
        }
      } catch (error) {
        console.error("Error fetching pending signups for notifications:", error);
      }
    };

    fetchPendingSignups();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingSignups, 30000);
    return () => clearInterval(interval);
  }, [authUser, authLoading]);

  const handleTabClick = useCallback(
    (tab: AppTab) => {
      const route = tab === "Dashboard" ? "/" : `/${tab.toLowerCase()}`;
      router.push(route);
    },
    [router]
  );

  const quickTabs = useMemo(() => {
    const primaryTabs: AppTab[] = ["Dashboard", "Payments", "Settings"];
    return primaryTabs.filter((tab) => tab !== activeTab);
  }, [activeTab]);

  // Tailor navigation by role so Sales gets a focused CRM view
  const finalVisibleItems = useMemo(() => {
    if (!effectiveRole || effectiveRole === "admin") {
      return navItems;
    }
    // Sales: hide workflows, receptionist, and settings from the sidebar
    if (effectiveRole === "sales") {
      return navItems.filter(
        (item) => item.key !== "Workflows" && item.key !== "Receptionist" && item.key !== "Settings"
      );
    }
    return navItems;
  }, [effectiveRole]);

  if (authLoading || (!authUser && typeof window !== "undefined")) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface)]">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
          Checking your workspace access…
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }
  const poweredBy = config ? getPoweredByText(config) : null;
  const poweredByValue = notificationsOpen ? undefined : poweredBy ?? undefined;
  const brandName = config?.branding?.name ?? "Revive";

  const notificationsControl = (
    <div ref={notificationsRef} className={cn("header-notifications", notificationsOpen && "is-open")}>
      <button
        type="button"
        className={cn("notification-button", notificationsOpen && "is-active")}
        onClick={() => setNotificationsOpen((prev) => !prev)}
        aria-label={notificationsOpen ? "Close notifications" : "Open notifications"}
        aria-haspopup="dialog"
        aria-expanded={notificationsOpen}
        aria-controls="header-notifications-panel"
      >
        <Bell size={18} />
        {unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount}</span>}
      </button>
      {notificationsOpen && (
        <div className="notification-popover" role="dialog" aria-modal="true" id="header-notifications-panel">
          <div className="notification-popover__header">
            <span>Notifications</span>
            <button
              type="button"
              className="notification-popover__mark"
              onClick={markAllNotificationsRead}
              disabled={unreadNotificationCount === 0}
            >
              Mark all read
            </button>
          </div>
          <div className="notification-popover__list" ref={notificationListRef}>
            {notifications.length ? (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn("notification-item", !item.read && "is-unread")}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className="notification-item__title">{item.title}</div>
                  <div className="notification-item__message">{item.message}</div>
                  <div className="notification-item__meta">
                    <span>{item.timestamp}</span>
                    {item.actionLabel && <span className="notification-item__action">{item.actionLabel}</span>}
                  </div>
                </button>
              ))
            ) : (
              <div className="notification-empty">You're all caught up.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const headerExtras = (
    <div className="header-actions">
      {notificationsControl}
      {quickTabs.length ? (
        <div className="header-quick-links" role="group" aria-label="Quick page shortcuts">
          {quickTabs.map((tab) => {
            const item = navItems.find((entry) => entry.key === tab);
            if (!item) return null;
            return (
              <button
                key={tab}
                className="quick-chip"
                onClick={() => handleTabClick(tab)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleTabClick(tab);
                  }
                }}
                type="button"
                title={item.label}
                aria-label={`Go to ${item.label}`}
              >
                <span className="quick-chip__icon">{item.icon}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {authUser.role === "admin" && (
        <button
          type="button"
          onClick={() => {
            const newRole: UserRole = tempRoleOverride === "sales" ? "admin" : "sales";
            setTempRoleOverride(newRole === authUser.role ? null : newRole);
            try {
              if (newRole === authUser.role) {
                localStorage.removeItem("revive-temp-role-override");
              } else {
                localStorage.setItem("revive-temp-role-override", newRole);
              }
            } catch {}
            // Refresh to apply role changes
            window.location.reload();
          }}
          className="inline-flex items-center justify-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 md:px-2 py-1 md:py-1.5 text-[10px] md:text-[11px] uppercase tracking-wide hover:bg-amber-500/30 ring-1 ring-amber-400/30 min-h-[44px] md:min-h-0 min-w-[44px] md:min-w-0 flex-shrink-0 ml-1"
          title={tempRoleOverride ? "Switch back to admin view" : "Switch to sales view (temporary)"}
          aria-label={tempRoleOverride ? "Switch back to admin view" : "Switch to sales view"}
        >
          <span className="hidden sm:inline">{tempRoleOverride === "sales" ? "Admin" : "Sales"}</span>
          <span className="sm:hidden">{tempRoleOverride === "sales" ? "A" : "S"}</span>
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          logout();
        }}
        className="inline-flex items-center justify-center gap-0.5 rounded-full bg-white/10 px-1.5 md:px-2 py-1 md:py-1.5 text-[10px] md:text-[11px] uppercase tracking-wide hover:bg-white/20 min-h-[44px] md:min-h-0 min-w-[44px] md:min-w-0 flex-shrink-0 ml-1"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={14} className="md:w-3 md:h-3" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );

  return (
    <TierProvider value={tierContextValue}>
      <TokenProvider>
        <OperationsProvider>
          <DesktopFrame tagline={["Centralize", "Automate", "Grow"]} brandName={brandName} poweredBy={poweredByValue} headerExtras={headerExtras}>
          {showLoginSplash && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 0.84, 0.44, 1] }}
              className="fixed inset-0 z-[999] grid place-items-center"
              style={{ background: "var(--surface)" }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 0.84, 0.44, 1] }}
                className="rounded-2xl px-6 py-4 ring-1 app-ring text-center"
                style={{ background: "color-mix(in oklab, var(--panel), transparent 10%)", color: "var(--foreground)" }}
              >
                <div className="micro-title">Welcome</div>
                <div className="mt-2 flex items-center justify-center">
                  {(() => {
                    const size = 96;
                    const stroke = 8;
                    const r = size / 2 - stroke;
                    const c = 2 * Math.PI * r;
                    const offset = c * (1 - loginProgress / 100);
                    return (
                      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={r}
                          fill="none"
                          stroke="color-mix(in oklab, var(--foreground), transparent 85%)"
                          strokeWidth={stroke}
                        />
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={r}
                          fill="none"
                          stroke="var(--brand)"
                          strokeWidth={stroke}
                          strokeLinecap="round"
                          strokeDasharray={c}
                          strokeDashoffset={offset}
                          style={{ transition: "stroke-dashoffset 120ms ease-out" }}
                        />
                        <text
                          x="50%"
                          y="50%"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="700"
                          fill="var(--foreground)"
                        >
                          {loginProgress}%
                        </text>
                      </svg>
                    );
                  })()}
                </div>
                <div className="mt-2 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                  Preparing Dashboard…
                </div>
              </motion.div>
            </motion.div>
          )}
          <div className="flex h-full gap-0 md:gap-4 w-full relative">
            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Sidebar container with hover zone - for CSS hover-to-show on desktop */}
            <div className="sidebar-container hidden md:flex">
              {/* Sidebar - hover-to-show on desktop */}
              <aside
                className={cn(
                  "z-40 transition-all duration-300 ease-in-out",
                  "desktop-sidebar"
                )}
              >
              <div
                className={cn(
                  "relative flex flex-col gap-2 app-sidebar app-ring rounded-lg p-3 transition-all duration-300",
                  "h-screen md:h-auto min-h-screen md:min-h-0",
                  "rounded-none md:rounded-lg",
                  sidebarCollapsed ? "w-16" : "w-64",
                  "md:block",
                  "overflow-hidden",
                  "bg-[var(--surface)]",
                  "min-w-0",
                  "w-64"
                )}
                onMouseEnter={() => {
                  // Keep sidebar visible when hovering over menu content
                  if (sidebarHideTimeoutRef.current) {
                    clearTimeout(sidebarHideTimeoutRef.current);
                    sidebarHideTimeoutRef.current = null;
                  }
                  setSidebarHovered(true);
                  setLeftEdgeHovered(true);
                }}
                onMouseLeave={(e) => {
                  // Only hide if not moving to another sidebar element
                  const relatedTarget = e.relatedTarget;
                  const isMovingWithinSidebar = relatedTarget && 
                                               relatedTarget instanceof HTMLElement &&
                                               (relatedTarget.closest('.app-sidebar') ||
                                                relatedTarget.closest('aside'));
                  
                  if (!isMovingWithinSidebar) {
                    sidebarHideTimeoutRef.current = setTimeout(() => {
                      setSidebarHovered(false);
                      setLeftEdgeHovered(false);
                    }, 400);
                  }
                }}
              >
                <div className="flex-shrink-0 flex items-center justify-end mb-2 gap-2">
                  {/* Desktop collapse button */}
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="rounded-full bg-zinc-800 p-2 ring-1 app-ring hover:opacity-90 hidden md:flex"
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    style={{ color: "white" }}
                  >
                    {sidebarCollapsed ? <ChevronRight size={14} className="text-white" /> : <ChevronLeft size={14} className="text-white" />}
                  </button>
                  {/* Mobile close button */}
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full bg-zinc-800 p-2 ring-1 app-ring hover:opacity-90 md:hidden flex-shrink-0 min-h-[44px] min-w-[44px]"
                    title="Close menu"
                    style={{ color: "white" }}
                  >
                    <ChevronLeft size={14} className="text-white" />
                  </button>
                </div>
                
                {/* Navigation Items - always show text in desktop hover sidebar */}
                <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
                  {finalVisibleItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        handleTabClick(item.key);
                        setMobileMenuOpen(false); // Close mobile menu on navigation
                      }}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-3 py-2.5 md:py-2 text-sm ring-1 transition-all w-full min-h-[44px] md:min-h-0",
                        activeTab === item.key ? "app-ring brand-text" : "ring-transparent",
                        "hover:opacity-90 active:opacity-75"
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tier-driven Insights - always show in desktop hover sidebar */}
                {currentInsight && (
                  <>
                    <div className="mt-6 mb-4 border-t app-ring flex-shrink-0"></div>
                    <div className="px-2 mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] flex-shrink-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      Insights
                    </div>
                    <div
                      className={cn(
                        "relative flex flex-col gap-4 rounded-xl p-5 transition-colors flex-shrink-0",
                        currentInsight.route ? "cursor-pointer hover:bg-zinc-800/35" : "cursor-default"
                      )}
                      onClick={() => {
                        if (currentInsight.route) {
                          router.push(currentInsight.route);
                        }
                      }}
                    >
                      <div className="flex flex-1 items-start gap-4">
                        <div className={cn("mt-1 flex-shrink-0", currentInsight.iconClassName ?? "brand-text")}>
                          {currentInsight.icon}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-4">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
                              {currentInsight.title}
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                              {currentInsight.subtitle}
                            </div>
                          </div>
                          {currentInsight.helper && (
                            <div className="text-[11px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                              {currentInsight.helper}
                            </div>
                          )}
                          {currentInsight.ctaLabel && currentInsight.ctaAction && (
                            <button
                              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-teal-300 hover:text-teal-100 mt-1"
                              onClick={(event) => {
                                event.stopPropagation();
                                currentInsight.ctaAction?.();
                              }}
                            >
                              {currentInsight.ctaLabel}
                              <ArrowUpRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] uppercase tracking-[0.3em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                        <span>
                          {insightIndex + 1}/{sidebarInsights.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            className="insight-nav-btn rounded-full p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleInsightStep(-1);
                            }}
                            title="Previous insight"
                            style={{ background: "transparent", border: "none" }}
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button
                            className="insight-nav-btn rounded-full p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleInsightStep(1);
                            }}
                            title="Next insight"
                            style={{ background: "transparent", border: "none" }}
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </aside>
            </div>

            {/* Mobile sidebar - drawer behavior */}
            <aside
              className={cn(
                "z-40 transition-transform duration-300 ease-in-out md:hidden",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
                "fixed h-full left-0 top-0",
                mobileMenuOpen ? "block" : "hidden"
              )}
            >
              <div
                className={cn(
                  "relative flex flex-col gap-2 app-sidebar app-ring rounded-lg p-3",
                  "h-screen min-h-screen",
                  "rounded-none",
                  sidebarCollapsed ? "w-16" : "w-64",
                  "overflow-hidden",
                  "bg-[var(--surface)]",
                  "w-64"
                )}
              >
                <div className="flex-shrink-0 flex items-center justify-end mb-2 gap-2">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full bg-zinc-800 p-2 ring-1 app-ring hover:opacity-90 flex-shrink-0 min-h-[44px] min-w-[44px]"
                    title="Close menu"
                    style={{ color: "white" }}
                  >
                    <ChevronLeft size={14} className="text-white" />
                  </button>
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
                  {finalVisibleItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        handleTabClick(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ring-1 transition-all w-full min-h-[44px]",
                        activeTab === item.key ? "app-ring brand-text" : "ring-transparent",
                        "hover:opacity-90 active:opacity-75"
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex-1 rounded-lg app-main app-ring p-2 md:p-3 lg:p-6 min-w-0 overflow-x-hidden overflow-y-auto w-full max-w-full">
              <div className="mb-4 flex flex-row items-center gap-2 md:gap-3">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 ring-1 app-ring hover:bg-white/10 flex-shrink-0"
                  aria-label="Open menu"
                >
                  <LayoutGrid size={18} />
                </button>
                <h1 className="text-xl md:text-2xl font-semibold truncate flex-1" style={{ color: "var(--foreground)" }}>
                  {activeTab}
                </h1>
              </div>
              {/* Add padding at bottom for mobile nav */}
              <div className="pb-20 md:pb-0">
                {children}
              </div>
            </main>
          </div>
          
          {/* Mobile Bottom Navigation */}
          <MobileNav onMenuClick={() => setMobileMenuOpen(true)} />
          </DesktopFrame>
          </OperationsProvider>
      </TokenProvider>
    </TierProvider>
  );
}

