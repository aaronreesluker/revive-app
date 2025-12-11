"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutGrid, Users, Sparkles, CreditCard, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  route: string;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Home", icon: <LayoutGrid size={20} />, route: "/" },
  { key: "contacts", label: "Contacts", icon: <Users size={20} />, route: "/contacts" },
  { key: "assistant", label: "Assistant", icon: <Sparkles size={20} />, route: "/assistant" },
  { key: "payments", label: "Payments", icon: <CreditCard size={20} />, route: "/payments" },
];

interface MobileNavProps {
  onMenuClick: () => void;
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveKey = () => {
    if (pathname === "/") return "dashboard";
    const path = pathname.split("/")[1];
    return path || "dashboard";
  };

  const activeKey = getActiveKey();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 safe-area-bottom"
      style={{ 
        background: "color-mix(in oklab, var(--surface), transparent 5%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => router.push(item.route)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[60px]",
                isActive ? "text-teal-400" : "text-white/50 hover:text-white/70"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 rounded-xl bg-teal-500/15"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{item.icon}</span>
              <span className="relative z-10 text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        {/* More menu button */}
        <button
          onClick={onMenuClick}
          className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[60px] text-white/50 hover:text-white/70"
          aria-label="More"
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}


