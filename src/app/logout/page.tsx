"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logout();
    const timeout = setTimeout(() => router.replace("/login"), 600);
    return () => clearTimeout(timeout);
  }, [logout, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
        <Loader2 className="animate-spin text-teal-300" size={16} />
        Signing you out…
      </div>
    </div>
  );
}


