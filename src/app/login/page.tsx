"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { SignupForm } from "@/components/SignupForm";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, mfaRequired, pendingUser, login, verifyMfa } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Check for returnTo query parameter
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      router.replace(returnTo || "/");
    }
  }, [loading, router, user]);

  if (!loading && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#091325] via-[#0e1f38] to-[#061f23] p-6 text-white">
        Redirecting…
      </div>
    );
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.replace("/");
        return;
      }
      if (result.mfaRequired) {
        return;
      }
      setError(result.message ?? "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyMfa(code);
      if (result.success) {
        router.replace("/");
        return;
      }
      setError(result.message ?? "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#091325] via-[#0e1f38] to-[#061f23] p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_24px_48px_rgba(10,12,20,0.55)] backdrop-blur-2xl text-white">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-teal-200">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Revive Console Access
            </h1>
            <p className="text-xs uppercase tracking-wide text-white" style={{ color: "#ffffff" }}>
              Secure login for automation managers
            </p>
          </div>
        </div>

        {!mfaRequired && (
          <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-white" style={{ color: "#ffffff" }}>
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white placeholder:opacity-100 focus:border-teal-300 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-white" style={{ color: "#ffffff" }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white placeholder:opacity-100 focus:border-teal-300 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/50 bg-rose-500/25 p-3 text-xs text-white">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-white">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-transparent accent-teal-400" />
                Remember this device
              </label>
              <Link href="#" className="text-white hover:text-teal-100">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Checking…" : "Continue"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/10 px-2 text-white/60">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowSignupForm(true)}
              className="w-full border border-white/20"
            >
              Create Account
            </Button>
          </form>
        )}

        {mfaRequired && pendingUser && (
          <form className="space-y-4" onSubmit={handleMfaSubmit}>
            <div className="rounded-xl border border-white/20 bg-white/12 p-4 text-sm text-white">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck size={16} />
                <span className="font-medium text-white">Two-Factor Verification</span>
              </div>
              <p className="mt-2 text-xs">
                Enter the code from your authenticator app or SMS. We&apos;re verifying <strong>{pendingUser.phone}</strong> for
                {" "}
                <strong>{pendingUser.email}</strong>.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-white" style={{ color: "#ffffff" }}>
                6-digit code
              </label>
              <input
                type="text"
                pattern="[0-9]{6}"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="000000"
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white placeholder:opacity-100 tracking-[0.4em] focus:border-teal-300 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/50 bg-rose-500/25 p-3 text-xs text-white">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify and continue"}
            </Button>

            <button
              type="button"
              className="w-full text-center text-xs text-white hover:text-teal-100"
              onClick={() => {
                setCode("");
                setError(null);
                window.alert("Demo: resend triggered. Hook into your SMS/email provider here.");
              }}
            >
              Resend code
            </button>
          </form>
        )}

        <div className="mt-8 space-y-3 rounded-xl border border-white/15 bg-white/12 p-4 text-xs text-white">
          <div className="flex items-center gap-2 text-white">
            <Phone size={14} />
            <span>Need access? Contact your agency owner to send an invite with a personalised login.</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Lock size={14} />
            <span>
              2FA is required for all owners. Enable it under <strong>Settings → Security</strong> to protect client workflows.
            </span>
          </div>
        </div>
      </div>

      {showSignupForm && (
        <SignupForm
          onClose={() => setShowSignupForm(false)}
          onSuccess={() => {
            setShowSignupForm(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
}


