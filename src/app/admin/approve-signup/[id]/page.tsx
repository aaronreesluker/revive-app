"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PendingSignup } from "@/lib/supabase/types";
import { isAdminEmail } from "@/lib/admin";

export default function ApproveSignupPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const signupId = params.id as string;

  useEffect(() => {
    const fetchSignup = async () => {
      // If not logged in, redirect to login with return URL
      if (!user) {
        router.replace(`/login?returnTo=/admin/approve-signup/${signupId}`);
        return;
      }

      // If logged in but not an admin, show error
      if (!isAdminEmail(user.email)) {
        setError("Only admins can approve accounts");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Database not configured");
        setLoading(false);
        return;
      }

      if (!signupId) {
        setError("Invalid signup ID");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("pending_signups")
        .select("*")
        .eq("id", signupId)
        .single();

      if (fetchError || !data) {
        setError("Signup request not found");
        setLoading(false);
        return;
      }

      const signupData = data as PendingSignup;
      if (signupData.status !== "pending") {
        setError(`This signup request has already been ${signupData.status}`);
        setLoading(false);
        return;
      }

      setPendingSignup(signupData);
      setLoading(false);
    };

    fetchSignup();
  }, [user, signupId, router]);

  const handleApprove = async () => {
    // Password is optional - if not provided, use the one from signup request
    if (password) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/signup/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId: params.id,
          password: password || undefined, // Only send if provided
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to approve account");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/settings");
      }, 3000);
    } catch (err) {
      setError("Failed to approve account");
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/signup/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId: signupId,
          reason: reason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reject signup");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/settings");
      }, 2000);
    } catch (err) {
      setError("Failed to reject signup");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#091325] via-[#0e1f38] to-[#061f23] p-6 text-white">
        <div>Loading...</div>
      </div>
    );
  }

  if (error && !pendingSignup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#091325] via-[#0e1f38] to-[#061f23] p-6 text-white">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#091325] via-[#0e1f38] to-[#061f23] p-6 text-white">
        <div className="text-center">
          <div className="text-green-400 mb-4 text-lg">
            {pendingSignup?.status === "approved" ? "Account approved successfully!" : "Signup request rejected."}
          </div>
          <p className="text-sm text-white/60">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#091325] via-[#0e1f38] to-[#061f23] p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_24px_48px_rgba(10,12,20,0.55)] backdrop-blur-2xl text-white">
        <h1 className="text-2xl font-semibold mb-6">Approve Account Request</h1>

        {pendingSignup && (
          <div className="space-y-4 mb-6">
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Name</p>
              <p className="font-medium">{pendingSignup.name}</p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Email</p>
              <p className="font-medium">{pendingSignup.email}</p>
            </div>
            {pendingSignup.phone && (
              <div className="rounded-lg border border-white/20 bg-white/10 p-4">
                <p className="text-sm text-white/60 mb-1">Phone</p>
                <p className="font-medium">{pendingSignup.phone}</p>
              </div>
            )}
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Password</p>
              <p className="font-medium text-xs">Password provided by staff member (optional to override below)</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
              Override Password (Optional)
            </label>
            <p className="text-xs text-white/60 mb-2">
              Leave blank to use the password provided by the staff member, or set a new one.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to use staff password"
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
              minLength={8}
            />
          </div>
          {password && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/25 p-3 text-xs text-white">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={(password && (password.length < 8 || password !== confirmPassword)) || submitting}
              className="flex-1"
            >
              {submitting ? "Approving..." : "Verify & Create Account"}
            </Button>
            <Button
              onClick={handleReject}
              variant="ghost"
              disabled={submitting}
              className="flex-1 border border-red-500/50 text-red-300 hover:bg-red-500/20"
            >
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

