"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface SignupFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SignupForm({ onClose, onSuccess }: SignupFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate password
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/signup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit signup request");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      setError("Failed to submit signup request. Please try again.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_24px_48px_rgba(10,12,20,0.55)] backdrop-blur-2xl text-white">
          <div className="text-center">
            <div className="text-green-400 mb-4 text-lg">✓ Request Submitted</div>
            <p className="text-sm text-white/80 mb-6">
              Your signup request has been sent to aaron@revivemarketing.uk for approval.
              You will receive an email once your account is approved.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_24px_48px_rgba(10,12,20,0.55)] backdrop-blur-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-2">Create Account</h2>
        <p className="text-xs text-white/60 mb-6">
          Request access to Revive Console. Your request will be reviewed by an admin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7700 900000"
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
              Password *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 8 characters"
              minLength={8}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-white mb-2 block">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              minLength={8}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-teal-300 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/25 p-3 text-xs text-white">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 border border-white/20"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || !formData.password || formData.password.length < 8 || formData.password !== confirmPassword}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

