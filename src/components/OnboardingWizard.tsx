"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Users,
  Plug,
  CreditCard,
  Clock,
  Sparkles,
  Rocket
} from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  optional?: boolean;
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Revive",
      description: "Let's get your account set up in just a few minutes",
      icon: <Sparkles size={24} />,
      content: (
        <div className="text-center py-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
            <Rocket size={40} className="text-teal-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Welcome aboard! 🎉
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
            We'll walk you through the key features and help you configure your account. 
            This should only take about 3 minutes.
          </p>
        </div>
      ),
    },
    {
      id: "import-contacts",
      title: "Import Your Contacts",
      description: "Bring in your existing customer data",
      icon: <Users size={24} />,
      optional: true,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
            You can import contacts from your existing CRM or add them manually. We support:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {["Go High Level", "CSV File", "Manual Entry", "API Sync"].map((option) => (
              <button
                key={option}
                className="rounded-lg border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 hover:border-teal-500/50 transition-all"
              >
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{option}</span>
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Don't worry, you can always import contacts later from Settings → Integrations
          </p>
        </div>
      ),
    },
    {
      id: "connect-integrations",
      title: "Connect Your Tools",
      description: "Link your existing business tools",
      icon: <Plug size={24} />,
      optional: true,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
            Connect your tools to unlock powerful automations:
          </p>
          <div className="space-y-2">
            {[
              { name: "Go High Level", desc: "CRM & Marketing", status: "Connect" },
              { name: "n8n Workflows", desc: "Automation", status: "Connect" },
              { name: "Stripe", desc: "Payments", status: "Connect" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{tool.name}</span>
                  <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>{tool.desc}</p>
                </div>
                <Button size="sm" variant="secondary">{tool.status}</Button>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "business-hours",
      title: "Set Business Hours",
      description: "Tell us when you're available",
      icon: <Clock size={24} />,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
            Your business hours help us schedule automations and set customer expectations.
          </p>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Quick Setup</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Mon-Fri 9-5", "Mon-Sat 8-6", "24/7", "Custom"].map((preset) => (
                <button
                  key={preset}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 hover:border-teal-500/50 transition-all"
                  style={{ color: "var(--foreground)" }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            You can customize this in detail from Settings → Business Hours
          </p>
        </div>
      ),
    },
    {
      id: "payment-setup",
      title: "Payment Setup",
      description: "Start accepting payments",
      icon: <CreditCard size={24} />,
      optional: true,
      content: (
        <div className="space-y-4 py-4">
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
            Connect your payment processor to start accepting payments from customers.
          </p>
          <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
            <div className="flex items-start gap-3">
              <CreditCard size={20} className="text-teal-400 mt-0.5" />
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>FastPayDirect (via GHL)</span>
                <p className="text-xs mt-1" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  Process payments, send invoices, and accept Text-2-Pay & Tap-2-Pay
                </p>
              </div>
            </div>
          </div>
          <Button variant="secondary" className="w-full">Connect Payment Processor</Button>
        </div>
      ),
    },
    {
      id: "complete",
      title: "You're All Set!",
      description: "Your account is ready to go",
      icon: <CheckCircle2 size={24} />,
      content: (
        <div className="text-center py-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            You're ready to go! 🚀
          </h3>
          <p className="text-sm max-w-md mx-auto mb-4" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
            Your account is set up. Explore the dashboard to see what Revive can do for your business.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            <span className="rounded-full bg-white/10 px-3 py-1">AI Assistant</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Smart Workflows</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Insights</span>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    setCompletedSteps((prev) => new Set([...prev, currentStepData.id]));
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, currentStepData.id, isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1 hover:bg-white/10 transition-colors z-10"
            aria-label="Close"
          >
            <X size={20} style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }} />
          </button>

          {/* Progress bar */}
          <div className="h-1 bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 py-4 px-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all",
                  index === currentStep && "ring-2 ring-teal-500 ring-offset-2 ring-offset-[var(--surface)]",
                  index < currentStep || completedSteps.has(step.id)
                    ? "bg-teal-500/20 text-teal-400"
                    : index === currentStep
                    ? "bg-white/10 text-white"
                    : "bg-white/5 text-white/40"
                )}
              >
                {index < currentStep || completedSteps.has(step.id) ? (
                  <CheckCircle2 size={16} />
                ) : (
                  index + 1
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepData.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400">
                    {currentStepData.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                      {currentStepData.title}
                    </h2>
                    <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      {currentStepData.description}
                      {currentStepData.optional && (
                        <span className="ml-2 text-teal-400">(Optional)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Step content */}
                {currentStepData.content}
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <div>
                {!isFirstStep && (
                  <Button variant="secondary" onClick={handleBack} className="inline-flex items-center gap-1">
                    <ChevronLeft size={16} />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentStepData.optional && !isLastStep && (
                  <Button variant="secondary" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
                <Button onClick={handleNext} className="inline-flex items-center gap-1">
                  {isLastStep ? "Get Started" : "Continue"}
                  {!isLastStep && <ChevronRight size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


