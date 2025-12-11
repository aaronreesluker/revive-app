"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { findDemoUserByEmail, type UserRole } from "../lib/auth-demo";
import { ContextErrorBoundary } from "@/components/ContextBoundary";
import { useEventLog } from "./EventLogContext";
import { getSupabaseClient, useDemoMode } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const STORAGE_KEY = "revive-auth-session";

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  tenantId: string;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  mfaRequired: boolean;
  pendingUser: AuthenticatedUser | null;
  storageError: string | null;
  isUsingDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; mfaRequired?: boolean; message?: string }>;
  verifyMfa: (code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  resetDemoSession: () => void;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface StoredSession {
  user: AuthenticatedUser;
  issuedAt: number;
}

// Convert Supabase user to our AuthenticatedUser format
function supabaseUserToAuthUser(supabaseUser: SupabaseUser, profile?: { name?: string; phone?: string; role?: UserRole; tenant_id?: string }): AuthenticatedUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: profile?.name ?? supabaseUser.user_metadata?.name ?? supabaseUser.email?.split("@")[0] ?? "User",
    phone: profile?.phone ?? supabaseUser.phone ?? "",
    role: profile?.role ?? "admin",
    tenantId: profile?.tenant_id ?? "default-tenant",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUser, setPendingUser] = useState<AuthenticatedUser | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isUsingDemoMode, setIsUsingDemoMode] = useState(true);
  const { recordEvent } = useEventLog();

  // Initialize auth - check Supabase first, fall back to demo mode
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      const isDemoMode = useDemoMode();
      setIsUsingDemoMode(isDemoMode);

      if (!isDemoMode) {
        // Use Supabase auth
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // Fetch user profile from database
              const { data: profile } = await supabase
                .from("profiles")
                .select("name, phone, role, tenant_id")
                .eq("id", session.user.id)
                .single();

              setUser(supabaseUserToAuthUser(session.user, profile ?? undefined));
            }

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
              if (session?.user) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("name, phone, role, tenant_id")
                  .eq("id", session.user.id)
                  .single();

                setUser(supabaseUserToAuthUser(session.user, profile ?? undefined));
              } else {
                setUser(null);
              }
            });

            setLoading(false);
            return () => subscription.unsubscribe();
          } catch (error) {
            console.warn("Supabase auth error, falling back to demo mode:", error);
            setIsUsingDemoMode(true);
          }
        }
      }

      // Demo mode - restore from localStorage
    try {
      const storedRaw = window.localStorage.getItem(STORAGE_KEY);
        if (storedRaw) {
      const stored: StoredSession = JSON.parse(storedRaw);
      setUser(stored.user);
      setStorageError(null);
        }
    } catch (error) {
      console.warn("Failed to restore session", error);
      window.localStorage.removeItem(STORAGE_KEY);
      setStorageError(error instanceof Error ? error.message : "Unknown storage error");
    } finally {
      setLoading(false);
    }
    };

    initAuth();
  }, []);

  const persistSession = useCallback((nextUser: AuthenticatedUser | null) => {
    if (typeof window === "undefined") return true;
    if (nextUser) {
      try {
        const payload: StoredSession = { user: nextUser, issuedAt: Date.now() };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
      } catch (error) {
        console.warn("Failed to persist session", error);
        return false;
      }
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn("Failed to clear session", error);
      return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Try Supabase auth first if configured
    if (!isUsingDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { success: false, message: error.message };
          }

          if (data.user) {
            // Fetch user profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, phone, role, tenant_id")
              .eq("id", data.user.id)
              .single();

            const authUser = supabaseUserToAuthUser(data.user, profile ?? undefined);
            setUser(authUser);

            try {
              sessionStorage.setItem("revive-just-logged-in", "1");
            } catch {}

            recordEvent({
              category: "auth",
              action: "login_success",
              summary: `${authUser.email} signed in`,
              severity: "info",
              meta: { userId: authUser.id },
            });

            return { success: true };
          }
        } catch (error) {
          console.warn("Supabase login error:", error);
          return { success: false, message: "Authentication failed" };
        }
      }
    }

    // Fall back to demo login
    const candidate = findDemoUserByEmail(email);
    if (!candidate) {
      return { success: false, message: "Account not found" };
    }

    const passwordMatches = candidate.password === password;
    if (!passwordMatches) {
      return { success: false, message: "Incorrect password" };
    }

    const authUser: AuthenticatedUser = {
      id: candidate.id,
      email: candidate.email,
      name: candidate.name,
      phone: candidate.phone,
      role: candidate.role,
      tenantId: candidate.tenantId,
    };

    if (candidate.mfaEnabled) {
      setPendingUser(authUser);
      return { success: false, mfaRequired: true };
    }

    setUser(authUser);
    const persisted = persistSession(authUser);
    setStorageError(persisted ? null : "Unable to persist session. You may need to login again after refresh.");
    setPendingUser(null);
    try {
      sessionStorage.setItem("revive-just-logged-in", "1");
    } catch {}
    recordEvent({
      category: "auth",
      action: "login_success",
      summary: `${authUser.email} signed in`,
      severity: "info",
      meta: { userId: authUser.id },
    });
    return { success: true };
  }, [isUsingDemoMode, persistSession, recordEvent]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!isUsingDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
            },
          });

          if (error) {
            return { success: false, message: error.message };
          }

          if (data.user) {
            // Create profile record
            await (supabase.from("profiles").insert({
              id: data.user.id,
              email,
              name,
              tenant_id: "default-tenant",
              role: "admin",
            } as any));

            recordEvent({
              category: "auth",
              action: "signup_success",
              summary: `${email} created account`,
              severity: "info",
              meta: { userId: data.user.id },
            });

            return { success: true, message: "Account created! Please check your email to verify." };
          }
        } catch (error) {
          console.warn("Supabase signup error:", error);
          return { success: false, message: "Registration failed" };
        }
      }
    }

    return { success: false, message: "Registration not available in demo mode" };
  }, [isUsingDemoMode, recordEvent]);

  const verifyMfa = useCallback(
    async (code: string) => {
      if (!pendingUser) {
        return { success: false, message: "No MFA challenge in progress" };
      }

      const candidate = findDemoUserByEmail(pendingUser.email);
      if (!candidate || !candidate.mfaEnabled) {
        setPendingUser(null);
        setUser(pendingUser);
        const persisted = persistSession(pendingUser);
        setStorageError(persisted ? null : "Unable to persist session. You may need to login again after refresh.");
        recordEvent({
          category: "auth",
          action: "mfa_bypass",
          summary: `${pendingUser.email} signed in without MFA challenge`,
          severity: "warning",
          meta: { userId: pendingUser.id },
        });
        return { success: true };
      }

      if (candidate.mfaCode && candidate.mfaCode === code.trim()) {
        setUser(pendingUser);
        const persisted = persistSession(pendingUser);
        setStorageError(persisted ? null : "Unable to persist session. You may need to login again after refresh.");
        setPendingUser(null);
        try {
          sessionStorage.setItem("revive-just-logged-in", "1");
        } catch {}
        recordEvent({
          category: "auth",
          action: "mfa_verified",
          summary: `${pendingUser.email} passed MFA`,
          severity: "info",
          meta: { userId: pendingUser.id },
        });
        return { success: true };
      }

      return { success: false, message: "Invalid verification code" };
    },
    [pendingUser, persistSession, recordEvent]
  );

  const logout = useCallback(async () => {
    // Sign out from Supabase if using it
    if (!isUsingDemoMode) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }

    const currentUser = user;
    setUser(null);
    setPendingUser(null);
    const cleared = persistSession(null);
    setStorageError(cleared ? null : "Could not clear stored session. Data will be discarded on refresh.");

    if (pathname !== "/login") {
      router.replace("/login");
    }

    if (currentUser) {
      recordEvent({
        category: "auth",
        action: "logout",
        summary: `${currentUser.email} signed out`,
        severity: "info",
        meta: { userId: currentUser.id },
      });
    }
  }, [isUsingDemoMode, pathname, persistSession, router, recordEvent, user]);

  const resetDemoSession = useCallback(() => {
    setUser(null);
    setPendingUser(null);
    setStorageError(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    recordEvent({
      category: "auth",
      action: "reset_demo_state",
      summary: "Authentication demo data reset",
      severity: "info",
    });
  }, [recordEvent]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mfaRequired: Boolean(pendingUser),
      pendingUser,
      storageError,
      isUsingDemoMode,
      login,
      verifyMfa,
      logout,
      resetDemoSession,
      signUp,
    }),
    [user, loading, pendingUser, storageError, isUsingDemoMode, login, verifyMfa, logout, resetDemoSession, signUp]
  );

  return (
    <ContextErrorBoundary name="AuthContext" onReset={resetDemoSession}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
