"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutGrid,
  Users,
  Workflow,
  Star,
  CreditCard,
  Bot,
  Settings,
  Phone,
  Sparkles,
  BarChart3,
  ArrowRight,
  Command,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  type: "page" | "contact" | "action" | "recent";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  route?: string;
  action?: () => void;
  keywords?: string[];
};

const pages: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Overview and KPIs", icon: <LayoutGrid size={18} />, route: "/", keywords: ["home", "overview", "kpi", "metrics"] },
  { id: "contacts", type: "page", title: "Contacts", subtitle: "Manage your contacts", icon: <Users size={18} />, route: "/contacts", keywords: ["people", "customers", "clients", "leads"] },
  { id: "workflows", type: "page", title: "Workflows", subtitle: "Automation workflows", icon: <Workflow size={18} />, route: "/workflows", keywords: ["automation", "triggers", "actions"] },
  { id: "reviews", type: "page", title: "Reviews", subtitle: "Customer reviews", icon: <Star size={18} />, route: "/reviews", keywords: ["feedback", "ratings", "testimonials"] },
  { id: "payments", type: "page", title: "Payments", subtitle: "Payment history", icon: <CreditCard size={18} />, route: "/payments", keywords: ["invoices", "billing", "transactions", "money"] },
  { id: "sales", type: "page", title: "Sales", subtitle: "Sales pipeline", icon: <BarChart3 size={18} />, route: "/sales", keywords: ["leads", "pipeline", "deals", "opportunities"] },
  { id: "insights", type: "page", title: "Insights", subtitle: "Analytics and reports", icon: <Bot size={18} />, route: "/insights", keywords: ["analytics", "reports", "data", "charts"] },
  { id: "receptionist", type: "page", title: "Receptionist", subtitle: "AI phone assistant", icon: <Phone size={18} />, route: "/receptionist", keywords: ["calls", "phone", "ai", "voice"] },
  { id: "assistant", type: "page", title: "Assistant", subtitle: "AI chat assistant", icon: <Sparkles size={18} />, route: "/assistant", keywords: ["chat", "ai", "help", "support"] },
  { id: "settings", type: "page", title: "Settings", subtitle: "App settings", icon: <Settings size={18} />, route: "/settings", keywords: ["preferences", "config", "account", "profile"] },
];

const quickActions: SearchResult[] = [
  { id: "new-contact", type: "action", title: "Add new contact", subtitle: "Create a contact", icon: <Users size={18} />, route: "/contacts?action=new", keywords: ["create", "add", "new"] },
  { id: "new-workflow", type: "action", title: "Create workflow", subtitle: "Set up automation", icon: <Workflow size={18} />, route: "/workflows?action=new", keywords: ["create", "automation"] },
  { id: "view-analytics", type: "action", title: "View token analytics", subtitle: "Token usage stats", icon: <BarChart3 size={18} />, route: "/analytics/tokens", keywords: ["usage", "tokens"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("revive-recent-searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard shortcut to open (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Filter results based on query
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    
    if (!q) {
      // Show pages and recent when no query
      return [...pages.slice(0, 6), ...quickActions.slice(0, 3)];
    }

    const allItems = [...pages, ...quickActions];
    
    return allItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(q);
      const keywordMatch = item.keywords?.some((k) => k.includes(q));
      return titleMatch || subtitleMatch || keywordMatch;
    });
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchResult) => {
    // Save to recent searches
    if (query.trim()) {
      const newRecent = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
      setRecentSearches(newRecent);
      try {
        localStorage.setItem("revive-recent-searches", JSON.stringify(newRecent));
      } catch {
        // ignore
      }
    }

    setOpen(false);
    
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <>
      {/* Trigger button for header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
        style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}
      >
        <Search size={14} />
        <span>Search...</span>
        <kbd className="ml-2 flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Mobile search button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
        aria-label="Search"
      >
        <Search size={18} style={{ color: "var(--foreground)" }} />
      </button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop with blur - only covers dashboard content area, not header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-x-0 bottom-0 z-40 bg-black/30 backdrop-blur-lg"
              style={{ 
                top: "var(--header-height, 52px)",
                WebkitBackdropFilter: "blur(12px)" 
              }}
              onClick={() => setOpen(false)}
            />
            {/* Click overlay for header area (no blur, just catches clicks to close) */}
            <div
              className="fixed inset-x-0 top-0 z-40"
              style={{ height: "var(--header-height, 52px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed left-1/2 top-[15%] z-50 w-[90%] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-white/10"
              style={{ 
                background: "#0f0f12",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 80px -20px rgba(0, 179, 179, 0.15)"
              }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search size={20} style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, contacts, actions..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-white/40"
                  style={{ color: "var(--foreground)" }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="rounded p-1 hover:bg-white/10"
                  >
                    <X size={16} style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }} />
                  </button>
                )}
                <kbd className="hidden sm:flex items-center rounded bg-white/10 px-2 py-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-1">
                    {!query && (
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                        Pages
                      </div>
                    )}
                    {results.map((item, index) => (
                      <button
                        key={item.id}
                        data-index={index}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          selectedIndex === index
                            ? "bg-white/10"
                            : "hover:bg-white/5"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            item.type === "action" ? "bg-teal-500/20" : "bg-white/10"
                          )}
                          style={{ color: item.type === "action" ? "rgb(0, 179, 179)" : "var(--foreground)" }}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs truncate" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        {selectedIndex === index && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                            <span>Open</span>
                            <ArrowRight size={12} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑</kbd>
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5">↓</kbd>
                    <span className="ml-1">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5">↵</kbd>
                    <span className="ml-1">Select</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5">ESC</kbd>
                  <span className="ml-1">Close</span>
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

