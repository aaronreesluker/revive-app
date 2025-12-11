"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Clock,
  Globe,
  Save,
  Gauge,
  Coins,
  PlusCircle,
  BarChart3,
  Sparkles,
  Layers,
  Trash2,
  ShieldAlert,
  Plug,
  KeyRound,
  ServerCog,
  RefreshCcw,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "../Button";
import { Select, type SelectOption } from "../Select";
import { useTier } from "../../context/TierContext";
import { useTokens } from "../../context/TokenContext";
import { useEventLog } from "../../context/EventLogContext";
import { useCurrentPlan } from "@/hooks/usePlanFeatures";
import { useAuth } from "@/context/AuthContext";
import { CreditCard, CheckCircle2, XCircle, ExternalLink, UserPlus, Users, CheckCircle, X, Lock } from "lucide-react";
import { getStripeConnectAccount, saveStripeConnectAccount, removeStripeConnectAccount } from "@/lib/stripe-connect-storage";
import { isAdminEmail } from "@/lib/admin";
import type { PendingSignup } from "@/lib/supabase/types";

type IntegrationKey = "ghl" | "n8n";

type IntegrationStatus = "disconnected" | "connected" | "error" | "pending";

interface IntegrationSettingsState {
  apiKey: string;
  sandbox: boolean;
  status: IntegrationStatus;
  lastValidated: string | null;
  lastError: string | null;
}

type IntegrationStateMap = Record<IntegrationKey, IntegrationSettingsState>;

type IntegrationFeedback = {
  type: "success" | "error";
  message: string;
};

const INTEGRATION_STORAGE_KEY = "revive-integrations-settings";
const VALID_INTEGRATION_STATUSES: IntegrationStatus[] = ["disconnected", "connected", "error", "pending"];

const createIntegrationDefaults = (): IntegrationStateMap => ({
  ghl: {
    apiKey: "",
    sandbox: true,
    status: "disconnected",
    lastValidated: null,
    lastError: null,
  },
  n8n: {
    apiKey: "",
    sandbox: true,
    status: "disconnected",
    lastValidated: null,
    lastError: null,
  },
});

type IntegrationMetadata = {
  label: string;
  vendor: string;
  description: string;
  validationHint: string;
  keyExample: string;
  docsLink?: string;
  envVars: string[];
};

const INTEGRATION_CATALOG: Record<IntegrationKey, IntegrationMetadata> = {
  ghl: {
    label: "Go High Level",
    vendor: "GHL",
    description:
      "Sync contacts, pipelines, and campaign events from your Go High Level workspace. We use the key below for both sandbox dry-runs and production pushes.",
    validationHint: "Keys should start with ghl_live_ or ghl_sandbox_ followed by at least 20 characters.",
    keyExample: "ghl_sandbox_2kJ3x5p9q1z7w4d8",
    docsLink: "https://help.gohighlevel.com/support/solutions/articles/48001228561-api-documentation",
    envVars: ["REVIVE_GHL_API_KEY", "REVIVE_GHL_BASE_URL", "REVIVE_GHL_SANDBOX"],
  },
  n8n: {
    label: "n8n Workflows",
    vendor: "n8n",
    description:
      "Trigger downstream automations via n8n. We expect a Personal Access Token with execution scope so we can queue jobs from Revive.",
    validationHint: "Tokens must start with n8n_ and include at least 24 characters. Use PATs generated in your n8n user settings.",
    keyExample: "n8n_3f4b5c6d7e8f901234567890",
    docsLink: "https://docs.n8n.io/hosting/advanced/authentication/personal-access-tokens/",
    envVars: ["REVIVE_N8N_API_KEY", "REVIVE_N8N_BASE_URL", "REVIVE_N8N_SANDBOX"],
  },
};

function validateIntegrationKey(integration: IntegrationKey, apiKey: string) {
  if (!apiKey) return false;
  if (integration === "ghl") {
    return /^ghl_(sandbox|live)_[a-z0-9]{16,}$/i.test(apiKey);
  }
  if (integration === "n8n") {
    return /^n8n_[a-z0-9]{24,}$/i.test(apiKey);
  }
  return false;
}

function normaliseIntegrationsFromStorage(raw: unknown): IntegrationStateMap {
  const defaults = createIntegrationDefaults();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const incoming = raw as Partial<Record<string, Partial<IntegrationSettingsState>>>;
  (Object.keys(defaults) as IntegrationKey[]).forEach((key) => {
    const candidate = incoming[key];
    if (candidate && typeof candidate === "object") {
      defaults[key] = {
        apiKey: typeof candidate.apiKey === "string" ? candidate.apiKey : defaults[key].apiKey,
        sandbox: typeof candidate.sandbox === "boolean" ? candidate.sandbox : defaults[key].sandbox,
        status:
          typeof candidate.status === "string" && VALID_INTEGRATION_STATUSES.includes(candidate.status as IntegrationStatus)
            ? (candidate.status as IntegrationStatus)
            : defaults[key].status,
        lastValidated: typeof candidate.lastValidated === "string" ? candidate.lastValidated : defaults[key].lastValidated,
        lastError: typeof candidate.lastError === "string" ? candidate.lastError : defaults[key].lastError,
      };
    }
  });
  return defaults;
}

export function SettingsPage() {
  const router = useRouter();
  const { recordEvent } = useEventLog();
  const { planId, plan, features } = useCurrentPlan();
  const { user } = useAuth();
  const tenantId = user?.tenantId || "demo-agency";
  const [saved, setSaved] = useState(false);
  const [timezone, setTimezone] = useState("Europe/London (GMT/BST)");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  // Admin: Pending signups and team members
  const isAdmin = user && (user.role === "admin" || isAdminEmail(user.email));
  const [pendingSignups, setPendingSignups] = useState<PendingSignup[]>([]);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, "admin" | "sales">>({});
  
  // Team members
  type TeamMember = { id: string; email: string; name: string; phone: string; role: string; created_at: string };
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  
  // Add account form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", email: "", phone: "", password: "", role: "sales" as "admin" | "sales" });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [syncingProfiles, setSyncingProfiles] = useState(false);
  
  // Password editing
  const [editingPasswordFor, setEditingPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("revive-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      // ignore theme persistence errors
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("revive-theme", next);
    recordEvent({
      category: "system",
      action: "theme_changed",
      summary: `Theme switched to ${next} mode`,
      severity: "info",
      meta: { theme: next },
    });
  };
  const [integrations, setIntegrations] = useState<IntegrationStateMap>(() => {
    if (typeof window === "undefined") {
      return createIntegrationDefaults();
    }
    try {
      const storedRaw = window.localStorage.getItem(INTEGRATION_STORAGE_KEY);
      if (!storedRaw) {
        return createIntegrationDefaults();
      }
      const parsed = JSON.parse(storedRaw);
      return normaliseIntegrationsFromStorage(parsed);
    } catch {
      return createIntegrationDefaults();
    }
  });
  const [integrationFeedback, setIntegrationFeedback] = useState<Record<IntegrationKey, IntegrationFeedback | null>>(() => ({
    ghl: null,
    n8n: null,
  }));
  const { tier, setTier } = useTier();
  const {
    baseAllowance,
    usedTokens,
    totalAddOnTokens,
    remainingTokens,
    totalTokens,
    availableAddons,
    purchases,
    purchaseAddon,
    refundAddon,
    rolloverTokens,
    killswitchEnabled,
    toggleKillswitch,
    killswitchTriggered,
    autoTopUpNotice,
    dismissAutoTopUpNotice,
  } = useTokens();
  
  // Stripe Connect state
  const [stripeAccount, setStripeAccount] = useState(() => {
    if (typeof window === "undefined") return null;
    return getStripeConnectAccount(tenantId);
  });
  const [stripeConnecting, setStripeConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(INTEGRATION_STORAGE_KEY, JSON.stringify(integrations));
    } catch {
      // ignore write failures (e.g. private browsing)
    }
  }, [integrations]);

  // Handle Stripe Connect OAuth callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stripeConnected = urlParams.get("stripe_connected");
    
    if (code && stripeConnected === "true") {
      handleStripeConnectCallback(code);
    }
  }, []);

  // Fetch pending signups for admins
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchPendingSignups = async () => {
      setLoadingSignups(true);
      try {
        const response = await fetch("/api/signup/pending");
        const data = await response.json();
        if (data.success) {
          setPendingSignups(data.pendingSignups || []);
        }
      } catch (error) {
        console.error("Error fetching pending signups:", error);
      } finally {
        setLoadingSignups(false);
      }
    };

    fetchPendingSignups();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingSignups, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fetch team members for admins
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchTeamMembers = async () => {
      setLoadingTeam(true);
      try {
        const response = await fetch("/api/users", {
          credentials: "include",
        });
        const data = await response.json();
        console.log("Team members response:", data);
        if (data.success) {
          setTeamMembers(data.users || []);
        } else {
          console.error("Failed to fetch team members:", data.error);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeamMembers();
    // Also refresh every 30 seconds like pending signups
    const interval = setInterval(fetchTeamMembers, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleApproveSignup = async (signupId: string) => {
    if (processingId) return;
    const role = selectedRoles[signupId] || "sales";
    setProcessingId(signupId);
    try {
      const response = await fetch(`/api/signup/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, role }),
      });
      const data = await response.json();
      if (data.success) {
        // Remove from list and refresh team members
        setPendingSignups((prev) => prev.filter((s) => s.id !== signupId));
        // Refresh team members list
        const usersResponse = await fetch("/api/users");
        const usersData = await usersResponse.json();
        if (usersData.success) {
          setTeamMembers(usersData.users || []);
        }
        recordEvent({
          category: "system",
          action: "signup_approved",
          summary: `Approved signup request for ${data.email} as ${role}`,
          severity: "info",
          meta: { signupId, email: data.email, role },
        });
        alert(`Account created successfully for ${data.email} as ${role}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error approving signup:", error);
      alert("Failed to approve signup. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSignup = async (signupId: string) => {
    if (processingId) return;
    const reason = prompt("Please provide a reason for rejection (optional):");
    if (reason === null) return; // User cancelled
    
    setProcessingId(signupId);
    try {
      const response = await fetch(`/api/signup/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, reason: reason || null }),
      });
      const data = await response.json();
      if (data.success) {
        // Remove from list
        setPendingSignups((prev) => prev.filter((s) => s.id !== signupId));
        recordEvent({
          category: "system",
          action: "signup_rejected",
          summary: `Rejected signup request for ${data.email}`,
          severity: "warning",
          meta: { signupId, email: data.email, reason },
        });
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error rejecting signup:", error);
      alert("Failed to reject signup. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingAccount) return;
    
    if (!newAccount.name || !newAccount.email || !newAccount.password) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (newAccount.password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    
    setCreatingAccount(true);
    try {
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh team members list
        const usersResponse = await fetch("/api/users", { credentials: "include" });
        const usersData = await usersResponse.json();
        if (usersData.success) {
          setTeamMembers(usersData.users || []);
        }
        
        recordEvent({
          category: "system",
          action: "account_created",
          summary: `Created account for ${data.user.email} as ${data.user.role}`,
          severity: "info",
          meta: { email: data.user.email, role: data.user.role },
        });
        
        alert(`Account created successfully for ${data.user.email}`);
        setNewAccount({ name: "", email: "", phone: "", password: "", role: "sales" });
        setShowAddForm(false);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating account:", error);
      alert("Failed to create account. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleSyncProfiles = async () => {
    if (syncingProfiles) return;
    
    setSyncingProfiles(true);
    try {
      const response = await fetch("/api/users/sync-profiles", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh team members list
        const usersResponse = await fetch("/api/users", { credentials: "include" });
        const usersData = await usersResponse.json();
        if (usersData.success) {
          setTeamMembers(usersData.users || []);
        }
        
        const syncedCount = data.synced?.length || 0;
        const errorCount = data.errors?.length || 0;
        
        if (syncedCount > 0 || errorCount > 0) {
          alert(
            `Sync completed!\n${syncedCount} profile(s) synced${errorCount > 0 ? `\n${errorCount} error(s)` : ""}`
          );
        } else {
          alert("All profiles are already in sync!");
        }
        
        recordEvent({
          category: "system",
          action: "profiles_synced",
          summary: `Synced ${syncedCount} profile(s)`,
          severity: "info",
          meta: { synced: syncedCount, errors: errorCount },
        });
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to sync profiles: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSyncingProfiles(false);
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch("/api/users/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const member = teamMembers.find(m => m.id === userId);
        alert(`Password updated successfully for ${member?.email || "user"}`);
        
        recordEvent({
          category: "system",
          action: "password_updated",
          summary: `Updated password for ${member?.email || userId}`,
          severity: "info",
          meta: { userId, email: member?.email },
        });

        // Reset form
        setEditingPasswordFor(null);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to update password: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // FastPayDirect is integrated via GHL - no OAuth callback needed

  const handleIntegrationApiKeyChange = (key: IntegrationKey, value: string) => {
    setIntegrations((prev) => {
      const trimmed = value;
      const hasValue = trimmed.trim().length > 0;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          apiKey: trimmed,
          status: hasValue ? "pending" : "disconnected",
          lastError: null,
          lastValidated: hasValue ? prev[key].lastValidated : null,
        },
      };
    });
    setIntegrationFeedback((prev) => ({ ...prev, [key]: null }));
  };

  const handleIntegrationSandboxToggle = (key: IntegrationKey) => {
    const current = integrations[key];
    const nextSandbox = !current.sandbox;
    const nextStatus = current.status === "connected" ? "pending" : current.status;
    setIntegrations((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        sandbox: nextSandbox,
        status: nextStatus,
        lastValidated: null,
      },
    }));
    setIntegrationFeedback((prev) => ({ ...prev, [key]: null }));
    const meta = INTEGRATION_CATALOG[key];
    recordEvent({
      category: "system",
      action: "integration_environment_changed",
      summary: `${meta.label} sandbox ${nextSandbox ? "enabled" : "disabled"}`,
      severity: "info",
      meta: { integration: key, sandbox: nextSandbox },
    });
  };

  const handleIntegrationReset = (key: IntegrationKey) => {
    const defaults = createIntegrationDefaults();
    const meta = INTEGRATION_CATALOG[key];
    setIntegrations((prev) => ({
      ...prev,
      [key]: defaults[key],
    }));
    setIntegrationFeedback((prev) => ({ ...prev, [key]: null }));
    recordEvent({
      category: "system",
      action: "integration_credentials_cleared",
      summary: `${meta.label} credentials removed`,
      severity: "warning",
      meta: { integration: key },
    });
  };

  const handleValidateIntegration = (key: IntegrationKey) => {
    const meta = INTEGRATION_CATALOG[key];
    const current = integrations[key];
    const trimmedKey = current.apiKey.trim();
    let status: IntegrationStatus = current.status;
    let lastValidated: string | null = current.lastValidated;
    let feedback: IntegrationFeedback;
    let lastError: string | null = null;

    if (!trimmedKey) {
      status = "error";
      lastError = "API key is required.";
      feedback = { type: "error", message: "Add your API key before validating." };
      recordEvent({
        category: "system",
        action: "integration_validation_failed",
        summary: `${meta.label} validation failed — missing API key`,
        severity: "warning",
        meta: { integration: key, reason: "missing_api_key" },
      });
    } else if (!validateIntegrationKey(key, trimmedKey)) {
      status = "error";
      lastError = "API key format is invalid.";
      feedback = { type: "error", message: meta.validationHint };
      recordEvent({
        category: "system",
        action: "integration_validation_failed",
        summary: `${meta.label} validation failed — invalid format`,
        severity: "warning",
        meta: { integration: key, reason: "invalid_format", providedLength: trimmedKey.length },
      });
    } else {
      status = "connected";
      lastValidated = new Date().toISOString();
      lastError = null;
      feedback = { type: "success", message: `${meta.label} connection saved. We logged the validation in the audit trail.` };
      recordEvent({
        category: "system",
        action: "integration_validated",
        summary: `${meta.label} configuration validated`,
        severity: "info",
        meta: { integration: key, sandbox: current.sandbox },
      });
    }

    setIntegrations((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        apiKey: trimmedKey,
        status,
        lastValidated,
        lastError,
      },
    }));
    setIntegrationFeedback((prev) => ({ ...prev, [key]: feedback }));
  };

  const integrationDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const usedPercent = Math.min(100, Math.round((usedTokens / Math.max(totalTokens, 1)) * 100));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Stripe Connect handlers
  const handleConnectStripe = async () => {
    setStripeConnecting(true);
    try {
      const response = await fetch(
        `/api/stripe-connect/oauth?tenant_id=${encodeURIComponent(tenantId)}&redirect_uri=${encodeURIComponent("/settings?stripe_connected=true")}`
      );
      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        setStripeConnecting(false);
        return;
      }
      
      // Redirect to Stripe OAuth
      window.location.href = data.oauthUrl;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      alert("Failed to connect Stripe. Please check your environment variables.");
      setStripeConnecting(false);
    }
  };

  const handleStripeConnectCallback = async (code: string) => {
    try {
      const response = await fetch("/api/stripe-connect/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tenantId }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      // Save connected account
      saveStripeConnectAccount(tenantId, {
        accountId: data.account.accountId,
        email: data.account.email,
        detailsSubmitted: data.account.detailsSubmitted,
      });
      
      setStripeAccount(getStripeConnectAccount(tenantId));
      
      // Clean up URL
      window.history.replaceState({}, "", "/settings");
      
      recordEvent({
        category: "system",
        action: "stripe_connected",
        summary: "Stripe account connected successfully",
        severity: "info",
        meta: { accountId: data.account.accountId },
      });
    } catch (error) {
      console.error("Error handling Stripe callback:", error);
      alert("Failed to complete Stripe connection.");
    }
  };

  const handleDisconnectStripe = () => {
    if (confirm("Are you sure you want to disconnect your Stripe account? You won't be able to collect payments until you reconnect.")) {
      removeStripeConnectAccount(tenantId);
      setStripeAccount(null);
      recordEvent({
        category: "system",
        action: "stripe_disconnected",
        summary: "Stripe account disconnected",
        severity: "info",
      });
    }
  };

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }),
    []
  );

  const tokensPerAutoPack = autoTopUpNotice
    ? Math.round(autoTopUpNotice.tokensAdded / Math.max(autoTopUpNotice.packsApplied, 1))
    : 0;

  const defaultAutoTopUpPack = availableAddons[1] ?? availableAddons[0] ?? null;
  const defaultRecommendedAddon = availableAddons[0] ?? null;
  const primaryRecommendedAddon = defaultRecommendedAddon;

  const handleAddOnPurchase = (addonId: string, addonName: string) => {
    purchaseAddon(addonId);
    alert(`${addonName} added to your account. Tokens are now available immediately.`);
  };

  const handleRefund = (purchaseId: string, addonName: string) => {
    refundAddon(purchaseId);
    alert(`${addonName} add-on removed. Tokens will drop off within the next few minutes.`);
  };

  const timezoneOptions: SelectOption[] = [
    { value: "Europe/London (GMT/BST)", label: "Europe/London (GMT/BST)" },
    { value: "Europe/Dublin (GMT/IST)", label: "Europe/Dublin (GMT/IST)" },
    { value: "Europe/Paris (CET/CEST)", label: "Europe/Paris (CET/CEST)" },
    { value: "Europe/Berlin (CET/CEST)", label: "Europe/Berlin (CET/CEST)" },
    { value: "Europe/Madrid (CET/CEST)", label: "Europe/Madrid (CET/CEST)" },
    { value: "Europe/Rome (CET/CEST)", label: "Europe/Rome (CET/CEST)" },
    { value: "Europe/Amsterdam (CET/CEST)", label: "Europe/Amsterdam (CET/CEST)" },
    { value: "Europe/Stockholm (CET/CEST)", label: "Europe/Stockholm (CET/CEST)" },
    { value: "Europe/Vienna (CET/CEST)", label: "Europe/Vienna (CET/CEST)" },
    { value: "Europe/Zurich (CET/CEST)", label: "Europe/Zurich (CET/CEST)" },
    { value: "Europe/Brussels (CET/CEST)", label: "Europe/Brussels (CET/CEST)" },
    { value: "Europe/Lisbon (WET/WEST)", label: "Europe/Lisbon (WET/WEST)" },
    { value: "Europe/Athens (EET/EEST)", label: "Europe/Athens (EET/EEST)" },
    { value: "Europe/Warsaw (CET/CEST)", label: "Europe/Warsaw (CET/CEST)" },
    { value: "Europe/Prague (CET/CEST)", label: "Europe/Prague (CET/CEST)" },
  ];

  const dateFormatOptions: SelectOption[] = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  ];

  // Plan upgrade UI removed for in-house use

  return (
    <div className="space-y-6">
      {/* Features Status - Simplified for in-house use */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="brand-text" />
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Features
              </h3>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                All features enabled for internal use
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
              AI Receptionist
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: features.aiReceptionist ? "#34d399" : "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
              {features.aiReceptionist ? "✓ Enabled" : "✗ Not included"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
              Auto Follow-ups
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: features.autoFollowUps ? "#34d399" : "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
              {features.autoFollowUps ? "✓ Enabled" : "✗ Not included"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
              Advanced Workflows
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: features.advancedWorkflows ? "#34d399" : "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
              {features.advancedWorkflows ? "✓ Enabled" : "✗ Not included"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
              Assistant Messages
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {features.assistantMessagesLimit.toLocaleString()}/mo
            </p>
          </div>
          {features.jointTokenCollective && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                Joint Token Collective
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "#34d399" }}>
                ✓ Available
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                £{features.jointTokenCollectivePricePerUser}/user/month
              </p>
              <p className="mt-1 text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                Add team members to share token pool
              </p>
            </div>
          )}
        </div>
      </div>


      {/* Profile Settings */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <User size={18} className="brand-text" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Profile & Account
        </h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Full Name
            </label>
            <input
              type="text"
                defaultValue="John Smith"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Email Address
              </label>
              <input
                type="email"
                defaultValue="john@example.com"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
              />
          </div>
          <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Phone Number
            </label>
              <input
                type="tel"
                defaultValue="(555) 123-4567"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Company Name
              </label>
              <input
                type="text"
                defaultValue="Smith Construction"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Admin: Pending Signups */}
      {isAdmin && (
        <div className="card-glass rounded-xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={18} className="brand-text" />
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Pending Account Requests
              </h3>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Review and approve staff account signup requests
              </p>
            </div>
          </div>
          {loadingSignups ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Loading pending requests...
              </div>
            </div>
          ) : pendingSignups.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <Users size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                No pending signup requests
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                  style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="brand-text" />
                        <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                          {signup.name}
                        </span>
                      </div>
                      <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                        {signup.email}
                      </div>
                      {signup.phone && (
                        <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                          {signup.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                        <Clock size={12} />
                        Requested {new Date(signup.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* Role Selection */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                          Role:
                        </label>
                        <select
                          value={selectedRoles[signup.id] || "sales"}
                          onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [signup.id]: e.target.value as "admin" | "sales" }))}
                          className="rounded-md bg-white/10 px-2 py-1 text-sm ring-1 app-ring focus:outline-none"
                          disabled={processingId === signup.id}
                        >
                          <option value="sales">Sales</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveSignup(signup.id)}
                          disabled={processingId === signup.id}
                          className="inline-flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          {processingId === signup.id ? "Processing..." : "Approve"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRejectSignup(signup.id)}
                          disabled={processingId === signup.id}
                          className="inline-flex items-center gap-1"
                        >
                          <X size={14} />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin: Team Members */}
      {isAdmin && (
        <div className="card-glass rounded-xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="brand-text" />
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  Team Members
                </h3>
                <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  All users with access to the system
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncProfiles}
                disabled={syncingProfiles}
                className="inline-flex items-center gap-1"
                title="Sync missing profiles for existing auth users"
              >
                <RefreshCcw size={14} className={syncingProfiles ? "animate-spin" : ""} />
                {syncingProfiles ? "Syncing..." : "Sync Profiles"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1"
              >
                <UserPlus size={14} />
                {showAddForm ? "Cancel" : "Add Account"}
              </Button>
            </div>
          </div>
          
          {/* Add Account Form */}
          {showAddForm && (
            <form onSubmit={handleCreateAccount} className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
              <h4 className="mb-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Create New Account
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newAccount.email}
                    onChange={(e) => setNewAccount((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newAccount.phone}
                    onChange={(e) => setNewAccount((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="07123 456789"
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                    Role *
                  </label>
                  <select
                    value={newAccount.role}
                    onChange={(e) => setNewAccount((prev) => ({ ...prev, role: e.target.value as "admin" | "sales" }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                  >
                    <option value="sales">Sales</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAccount({ name: "", email: "", phone: "", password: "", role: "sales" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={creatingAccount}
                  className="inline-flex items-center gap-1"
                >
                  <CheckCircle size={14} />
                  {creatingAccount ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
          
          {loadingTeam ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Loading team members...
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <Users size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                No team members found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-left font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>Name</th>
                    <th className="pb-3 text-left font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>Email</th>
                    <th className="pb-3 text-left font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>Phone</th>
                    <th className="pb-3 text-left font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>Role</th>
                    <th className="pb-3 text-left font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-white/5">
                      <td className="py-3" style={{ color: "var(--foreground)" }}>
                        <div className="flex items-center gap-2">
                          <User size={14} className="brand-text" />
                          {member.name || "—"}
                        </div>
                      </td>
                      <td className="py-3" style={{ color: "color-mix(in oklab, var(--foreground), transparent 20%)" }}>
                        {member.email}
                      </td>
                      <td className="py-3" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                        {member.phone || "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            member.role === "admin"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {member.role === "admin" ? "Admin" : "Sales"}
                        </span>
                      </td>
                      <td className="py-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {editingPasswordFor === member.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="New password"
                              className="w-32 rounded-md bg-transparent px-2 py-1 text-xs ring-1 app-ring focus:outline-none focus:ring-2"
                              minLength={8}
                              autoFocus
                            />
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm"
                              className="w-32 rounded-md bg-transparent px-2 py-1 text-xs ring-1 app-ring focus:outline-none focus:ring-2"
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdatePassword(member.id)}
                              disabled={updatingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                              className="h-7 px-2 text-xs"
                            >
                              {updatingPassword ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingPasswordFor(null);
                                setNewPassword("");
                                setConfirmPassword("");
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingPasswordFor(member.id)}
                            className="inline-flex items-center gap-1 h-7 px-2 text-xs"
                            title="Change password"
                          >
                            <Lock size={12} />
                            Change Password
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Appearance */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sun size={18} className="brand-text" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Appearance
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Theme
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Switch between light and dark mode
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/10"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? (
                <>
                  <Moon size={16} />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={16} />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell size={18} className="brand-text" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Notifications
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                New Lead Alerts
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Get notified when a new lead is captured
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-teal-300"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Appointment Reminders
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Receive reminders before scheduled appointments
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-teal-300"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Review Requests
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Notify when review requests are sent
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-teal-300"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Weekly Summary
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Receive weekly performance reports via email
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-teal-300"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={18} className="brand-text" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Business Hours
        </h3>
        </div>
        <div className="space-y-6 md:flex md:items-start md:gap-10 md:space-y-0">
          <div className="flex-1 space-y-3">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
              <div key={day} className="flex items-center gap-4">
                <div className="w-24 text-sm" style={{ color: "var(--foreground)" }}>
                  {day}
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="time"
                    defaultValue={day === "Sunday" ? "" : "09:00"}
                    disabled={day === "Sunday"}
                    className="rounded-md bg-transparent px-3 py-1.5 text-sm ring-1 app-ring disabled:opacity-50"
                  />
                  <span className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    to
              </span>
              <input
                    type="time"
                    defaultValue={day === "Sunday" ? "" : "17:00"}
                    disabled={day === "Sunday"}
                    className="rounded-md bg-transparent px-3 py-1.5 text-sm ring-1 app-ring disabled:opacity-50"
                  />
                  {day === "Sunday" && (
                    <span className="ml-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      Closed
                    </span>
                  )}
                </div>
              </div>
          ))}
        </div>
          <div
            className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4 md:w-[320px]"
            style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              <Globe size={16} className="brand-text" />
              <span>Timezone & Locale</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                  Timezone
                </label>
                <Select options={timezoneOptions} value={timezone} onChange={setTimezone} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                  Date Format
                </label>
                <Select options={dateFormatOptions} value={dateFormat} onChange={setDateFormat} />
              </div>
            </div>
            <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              These settings power receptionist follow-ups and the timestamps shown across your reports.
            </p>
          </div>
        </div>
      </div>

      {/* FastPayDirect - Payment Processing */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard size={18} className="brand-text" />
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Payment Processing
            </h3>
            <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Payments are processed through FastPayDirect (HighLevel). Create invoices, send Text-2-Pay links, and collect payments via Tap-2-Pay. <a href="https://fastpaydirect.com/" target="_blank" rel="noreferrer" className="text-teal-300 hover:text-teal-200 underline">Learn more</a>
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 text-emerald-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                FastPayDirect Integration
              </div>
              <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Payments are processed through FastPayDirect, integrated with your GoHighLevel account. Create invoices, send Text-2-Pay links, and collect payments via Tap-2-Pay.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://fastpaydirect.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs ring-1 app-ring hover:bg-white/20"
                >
                  <ExternalLink size={14} />
                  Visit FastPayDirect
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Navigate to GHL settings or FastPayDirect dashboard
                    window.open("https://fastpaydirect.com/", "_blank");
                  }}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-2 flex items-center gap-2">
          <Plug size={18} className="brand-text" />
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Integrations
            </h3>
            <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Manage API keys and sandbox modes for downstream platforms. Every validation is recorded in the audit log.
            </p>
          </div>
        </div>
        <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          We store credentials locally for the demo. Production wiring should read from server-side env vars and reuse the typed adapters in
          <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5">lib/ghl.ts</code> and
          <code className="ml-1 rounded bg-white/5 px-1.5 py-0.5">lib/n8n.ts</code>.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {(Object.keys(INTEGRATION_CATALOG) as IntegrationKey[]).map((key) => (
            <IntegrationCard
              key={key}
              metadata={INTEGRATION_CATALOG[key]}
              state={integrations[key]}
              feedback={integrationFeedback[key]}
              onApiKeyChange={(value) => handleIntegrationApiKeyChange(key, value)}
              onSandboxToggle={() => handleIntegrationSandboxToggle(key)}
              onValidate={() => handleValidateIntegration(key)}
              onReset={() => handleIntegrationReset(key)}
              dateFormatter={integrationDateFormatter}
            />
          ))}
        </div>
      </div>

      {/* Stripe Connect */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard size={18} className="brand-text" />
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Payment Processing
            </h3>
            <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Connect your Stripe account to collect payments from customers. Payments go directly to your Stripe account.
            </p>
          </div>
        </div>
        
        {stripeAccount ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      Stripe Account Connected
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      Account ID: {stripeAccount.accountId}
                    </div>
                    {stripeAccount.email && (
                      <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                        Email: {stripeAccount.email}
                      </div>
                    )}
                    {!stripeAccount.detailsSubmitted && (
                      <div className="mt-2 rounded-md bg-amber-500/15 p-2 text-xs" style={{ color: "#fbbf24" }}>
                        ⚠️ Account setup incomplete. Please complete your Stripe account setup in the Stripe Dashboard.
                      </div>
                    )}
                    <div className="mt-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      Connected on {new Date(stripeAccount.connectedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDisconnectStripe}
                  className="inline-flex items-center gap-1"
                >
                  <XCircle size={14} />
                  Disconnect
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                className="inline-flex items-center gap-1"
              >
                <ExternalLink size={14} />
                Open Stripe Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-sm" style={{ color: "var(--foreground)" }}>
                Connect your Stripe account to enable payment collection. You'll be redirected to Stripe to authorize the connection.
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleConnectStripe}
              disabled={stripeConnecting}
              className="inline-flex items-center gap-2"
            >
              <CreditCard size={16} />
              {stripeConnecting ? "Connecting..." : "Connect Stripe Account"}
            </Button>
            <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              Make sure you have <code className="rounded bg-white/5 px-1.5 py-0.5">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5">STRIPE_CONNECT_CLIENT_ID</code> set in your <code className="rounded bg-white/5 px-1.5 py-0.5">.env.local</code> file.
            </p>
          </div>
        )}
      </div>

      {/* Token Usage */}
      <div className="card-glass rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Gauge size={18} className="brand-text" />
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Token Usage
        </h3>
        </div>
        {autoTopUpNotice && (
          <div
            className="mb-3 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <div className="mt-0.5">
              <ShieldAlert size={16} className="text-emerald-300" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Automatic top-up applied</div>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {autoTopUpNotice.packsApplied} × {tokensPerAutoPack.toLocaleString()} tokens added ({currencyFormatter.format(autoTopUpNotice.chargeGBP)} charge) on {new Date(autoTopUpNotice.occurredAt).toLocaleString()}.
              </p>
            </div>
            <button
              onClick={dismissAutoTopUpNotice}
              className="text-xs uppercase tracking-wide text-emerald-200 hover:text-emerald-100"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            {remainingTokens === 0 && (
              <div
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                <div className="flex items-start gap-2">
                  <ShieldAlert size={16} className="text-rose-300" />
                  <div>
                    <span className="font-semibold">Token limit reached.</span>
                    <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                      {killswitchEnabled
                        ? "Emergency kill switch is active. Automations are paused until you add more tokens."
                        : "Consider enabling the kill switch or adding a top-up so automations don’t run without coverage."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  <Coins size={14} /> Plan Tokens
                </div>
                <div className="mt-1 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {baseAllowance.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  <Layers size={14} /> Add-on Tokens
                </div>
                <div className="mt-1 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {totalAddOnTokens.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  <Layers size={14} /> Carryover
                </div>
                <div className="mt-1 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {rolloverTokens.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
                <div className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  Used
                </div>
                <div className="mt-1 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {usedTokens.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
                <div className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  Remaining
                </div>
                <div className="mt-1 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {remainingTokens.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                <span>Usage</span>
                <span>{usedPercent}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full ring-1 app-ring" style={{ background: "color-mix(in oklab, var(--panel), transparent 70%)" }}>
                <div
                  className="h-full rounded-full brand-bg transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Tokens reset on the 1st of each month. We’ll notify you automatically at 80% usage.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-4 text-sm backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Top-up Marketplace
              </div>
              <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                Add packs to unlock more automation headroom. Credits activate instantly and roll into unused balance.
              </p>
            </div>
            <div className="space-y-3">
              {availableAddons.map((addon) => (
                <div key={addon.id} className="rounded-lg border border-white/10 bg-white/5 p-3" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {addon.name}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                        {addon.description}
                      </p>
                      {addon.highlight && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium" style={{ color: "#34d399" }}>
                          {addon.highlight}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                        {currencyFormatter.format(addon.priceGBP)}
                      </div>
                      <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                        {addon.tokens.toLocaleString()} tokens
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                      Instant activation • No long-term commitment
                    </span>
                    <Button size="sm" onClick={() => handleAddOnPurchase(addon.id, addon.name)}>
                      <PlusCircle size={14} className="mr-1" /> Add pack
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              className="inline-flex w-full items-center justify-center gap-2"
              onClick={() => router.push("/analytics/tokens")}
            >
              <BarChart3 size={16} />
              View Token Analytics
            </Button>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3" style={{ background: "color-mix(in oklab, var(--panel), transparent 75%)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    Emergency kill switch
                  </div>
                  <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    Pause automation runs automatically when usage hits 100%.
                  </p>
              <p className="mt-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                {killswitchEnabled
                  ? "When this switch is on we pause every automation once usage hits 100%. Switch it off if you’d rather we auto-purchase your back-up pack instead."
                  : `With the switch off we automatically add the premium ${defaultAutoTopUpPack ? defaultAutoTopUpPack.name : "top-up"} as soon as usage reaches 100%, so your automations keep running without interruption.`}
              </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={killswitchEnabled}
                    onChange={toggleKillswitch}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-emerald-300"></div>
                </label>
              </div>
              {killswitchTriggered && (
                <div className="mt-3 rounded-md bg-emerald-500/15 p-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                  Kill switch activated — automations remain paused until additional tokens are added.
                </div>
              )}
        </div>
          </div>
        </div>

        {purchases.length > 0 && (
          <div className="mt-4 rounded-xl border border-white/5 bg-white/5 p-4 text-sm backdrop-blur-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 78%)" }}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Active add-ons
                </h4>
                <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Add-on credits stack on top of your base allowance and roll over until you’ve used them.
                </p>
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Total add-on tokens: {totalAddOnTokens.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <div key={purchase.purchaseId} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {purchase.addon.name}
                    </div>
                    <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      {purchase.addon.tokens.toLocaleString()} tokens • {currencyFormatter.format(purchase.chargeGBP ?? purchase.addon.priceGBP)} • Purchased {new Date(purchase.purchasedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium" style={{ color: "#34d399" }}>
                      Active
                    </span>
                    {purchase.autoTopUp && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                        Auto top-up
                      </span>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="inline-flex items-center gap-1"
                      onClick={() => handleRefund(purchase.purchaseId, purchase.addon.name)}
                    >
                      <Trash2 size={14} />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary" className="inline-flex items-center gap-2">
          <Save size={16} />
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

interface IntegrationCardProps {
  metadata: IntegrationMetadata;
  state: IntegrationSettingsState;
  feedback: IntegrationFeedback | null;
  onApiKeyChange: (value: string) => void;
  onSandboxToggle: () => void;
  onValidate: () => void;
  onReset: () => void;
  dateFormatter: Intl.DateTimeFormat;
}

function IntegrationCard({
  metadata,
  state,
  feedback,
  onApiKeyChange,
  onSandboxToggle,
  onValidate,
  onReset,
  dateFormatter,
}: IntegrationCardProps) {
  const statusClasses: Record<IntegrationStatus, string> = {
    connected: "bg-emerald-500/15 text-emerald-200",
    pending: "bg-amber-500/15 text-amber-200",
    error: "bg-rose-500/15 text-rose-200",
    disconnected: "bg-white/10 text-zinc-200",
  };

  const statusCopy: Record<IntegrationStatus, string> = {
    connected: "Connected",
    pending: "Pending validation",
    error: "Needs attention",
    disconnected: "Not configured",
  };

  const message = feedback ?? (state.status === "error" && state.lastError ? { type: "error", message: state.lastError } : null);

  const lastValidatedCopy = state.lastValidated ? dateFormatter.format(new Date(state.lastValidated)) : "Never";

  const sandboxHelp = state.sandbox
    ? "Sandbox mode keeps writes in a safe staging workspace and tags logs accordingly."
    : "Live mode will send production traffic. Be sure the API key has the right scopes.";

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/10 p-2">
            <KeyRound size={16} className="brand-text" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {metadata.label}
            </div>
            <p className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              {metadata.description}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-wide ${statusClasses[state.status]}`}>{statusCopy[state.status]}</span>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
          API Key
        </label>
        <input
          type="password"
          value={state.apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={metadata.keyExample}
          className="mt-1 w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
        />
        <p className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          Example: <code className="rounded bg-white/10 px-1 py-0.5">{metadata.keyExample}</code>
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3" style={{ background: "color-mix(in oklab, var(--panel), transparent 86%)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            <ServerCog size={16} className="brand-text" />
            <span>Sandbox Mode</span>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={state.sandbox} onChange={onSandboxToggle} />
            <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-emerald-300"></div>
          </label>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {sandboxHelp}
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-[11px]" style={{ background: "color-mix(in oklab, var(--panel), transparent 88%)", color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
          <ServerCog size={14} className="brand-text" />
          <span>Server wiring checklist</span>
        </div>
        <p className="mt-1">Mirror these environment variables when promoting to production:</p>
        <ul className="mt-2 space-y-1">
          {metadata.envVars.map((envVar) => (
            <li key={envVar}>
              <code className="rounded bg-black/20 px-1.5 py-0.5">{envVar}</code>
            </li>
          ))}
        </ul>
        {metadata.docsLink && (
          <a href={metadata.docsLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-teal-200 hover:text-teal-100">
            Vendor docs
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
        <span>Last validated: {lastValidatedCopy}</span>
        {state.status === "connected" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">Audit trail updated</span>}
      </div>

      {message && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            message.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" : "border-rose-500/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {message.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="inline-flex items-center gap-2" onClick={onValidate} disabled={!state.apiKey.trim()}>
          <RefreshCcw size={14} />
          Validate & Save
        </Button>
        <Button variant="secondary" size="sm" onClick={onReset}>
          Clear
        </Button>
      </div>
    </div>
  );
}

