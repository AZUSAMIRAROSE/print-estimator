import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { Printer, User, Building, ArrowRight, ArrowLeft, Sparkles, ChevronRight } from "lucide-react";

interface OnboardingData {
  name: string;
  email: string;
  company: string;
  phone: string;
  role: string;
  designation: string;
  department: string;
}

export function OnboardingScreen() {
  const { completeOnboarding } = useAppStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    email: "",
    company: "Thomson Press India Pvt Ltd.",
    phone: "",
    role: "Estimator",
    designation: "Senior Estimator",
    department: "Sales",
  });

  const canContinue = step === 0 ? true : step === 1 ? data.name.trim().length >= 2 : true;

  const handleFinish = () => {
    completeOnboarding(data);
  };

  const handleSkip = () => {
    completeOnboarding({ name: "User", company: data.company });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-surface-dark dark:via-surface-dark-secondary dark:to-surface-dark flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-500",
                s <= step
                  ? "bg-primary-500"
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>

        <div className="card p-8 animate-in">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Printer className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
                Welcome to Print Estimator Pro
              </h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-sm mx-auto mb-2">
                The industry's most advanced commercial print estimation platform.
                Calculate costs for paper, printing, binding, finishing, packing, and freight — all in one place.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nuclear-grade accuracy • 15-step wizard • Multi-quantity comparison</span>
              </div>
            </div>
          )}

          {/* Step 1: Name (Mandatory) */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10">
                  <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                    What's your name? <span className="text-danger-500">*</span>
                  </h2>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    This will appear on quotations and reports.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name <span className="text-danger-500">*</span></label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="input-field text-lg"
                    autoFocus
                  />
                  {data.name.trim().length > 0 && data.name.trim().length < 2 && (
                    <p className="text-xs text-danger-500 mt-1">Name must be at least 2 characters</p>
                  )}
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    placeholder="your@email.com"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Company & Role */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                  <Building className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                    Company Details
                  </h2>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    You can change these later in settings.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Company Name</label>
                  <input
                    type="text"
                    value={data.company}
                    onChange={(e) => setData({ ...data, company: e.target.value })}
                    placeholder="Your company name"
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Role</label>
                    <select
                      value={data.role}
                      onChange={(e) => setData({ ...data, role: e.target.value })}
                      className="input-field"
                    >
                      <option>Estimator</option>
                      <option>Manager</option>
                      <option>Sales</option>
                      <option>Production</option>
                      <option>Admin</option>
                      <option>Owner</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select
                      value={data.department}
                      onChange={(e) => setData({ ...data, department: e.target.value })}
                      className="input-field"
                    >
                      <option>Sales</option>
                      <option>Production</option>
                      <option>Pre-Press</option>
                      <option>Accounts</option>
                      <option>Management</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                You're all set, {data.name || "User"}!
              </h2>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                Print Estimator Pro is ready to use. Start by creating your first estimate or exploring the dashboard.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
                {[
                  "15-step estimation wizard",
                  "Multi-quantity comparison",
                  "PDF quotation generation",
                  "Customer management",
                  "Rate card editing",
                  "Advanced reports",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <ChevronRight className="w-3.5 h-3.5 text-success-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-light-border dark:border-surface-dark-border">
            <div>
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="btn-ghost flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step > 0 && step < 3 && (
                <button onClick={handleSkip} className="btn-ghost text-sm">
                  Skip Setup
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canContinue}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {step === 0 ? "Get Started" : "Continue"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleFinish} className="btn-primary flex items-center gap-1.5 px-6">
                  Launch App
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}