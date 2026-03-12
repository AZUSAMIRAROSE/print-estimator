import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { Printer, User, Building, ArrowRight, ArrowLeft, Sparkles, ChevronRight, FileText, BookOpen, Package, Truck } from "lucide-react";

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

  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#1a1f2e] text-white flex flex-col p-4 sm:p-6 font-sans">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center pt-8 md:pt-12 pb-12 animate-in fade-in duration-700 zoom-in-95">
          {/* Top icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20 border border-blue-400/20">
            <Printer className="w-8 h-8 text-white" />
          </div>

          {/* Top badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              Nuclear-grade accuracy
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              15-step wizard
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              Multi-qty comparison
            </div>
          </div>

          {/* Eyebrow label */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-[2px] w-8 bg-blue-500/50 rounded-full" />
            <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">Commercial Print Estimation Platform</span>
            <div className="h-[2px] w-8 bg-blue-500/50 rounded-full" />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-medium tracking-tight text-white text-center mb-10 leading-[1.1]">
            Print Estimator<br />
            <span className="text-blue-500 font-medium">Pro</span>
          </h1>

          {/* Stats Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-0 mb-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md w-full max-w-3xl">
            <div className="flex-1 w-full p-6 text-center border-b sm:border-b-0 sm:border-r border-white/10">
              <div className="text-3xl font-bold text-blue-400 mb-1.5">15</div>
              <div className="text-sm font-medium text-gray-400">Estimation steps</div>
            </div>
            <div className="flex-1 w-full p-6 text-center border-b sm:border-b-0 sm:border-r border-white/10">
              <div className="text-3xl font-bold text-green-400 mb-1.5">6+</div>
              <div className="text-sm font-medium text-gray-400">Cost categories</div>
            </div>
            <div className="flex-1 w-full p-6 text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1.5">∞</div>
              <div className="text-sm font-medium text-gray-400">Qty comparisons</div>
            </div>
          </div>

          {/* Two CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 w-full max-w-md mx-auto sm:max-w-none">
            <button
              onClick={() => setStep(1)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              Get started <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleSkip}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/20 hover:bg-white/10 text-white font-medium transition-all flex items-center justify-center cursor-pointer"
            >
              See how it works
            </button>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16 w-full text-left">
            {[
              { icon: FileText, color: 'bg-blue-500/20 text-blue-400 border-blue-500/20', title: 'Paper & stock', desc: 'Precise paper math and cut sizes' },
              { icon: Printer, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20', title: 'Printing', desc: 'Press time and ink consumption' },
              { icon: BookOpen, color: 'bg-purple-500/20 text-purple-400 border-purple-500/20', title: 'Binding', desc: 'Perfect, section, and loop stitching' },
              { icon: Sparkles, color: 'bg-pink-500/20 text-pink-400 border-pink-500/20', title: 'Finishing', desc: 'Lamination, foil, and UV coating' },
              { icon: Package, color: 'bg-orange-500/20 text-orange-400 border-orange-500/20', title: 'Packing', desc: 'Box sizes and weight calculation' },
              { icon: Truck, color: 'bg-green-500/20 text-green-400 border-green-500/20', title: 'Freight', desc: 'Shipping and logistics costs' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all flex items-start gap-4 group">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110", f.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1 text-base">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline Strip */}
          <div className="w-full overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex items-center justify-center min-w-max mx-auto gap-2 sm:gap-4 px-4">
              {["Job specs", "Paper", "Print", "Binding", "Finish", "Pack & ship", "Quote"].map((s, i, arr) => (
                <div key={i} className="flex items-center gap-2 sm:gap-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-gray-400">
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-8 sm:w-12 h-[2px] bg-white/10 -mt-6 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Creator Credit Pill */}
        <div className="flex items-center justify-center mt-auto pb-4">
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-full p-2 pr-6 hover:bg-white/[0.04] transition-colors cursor-default">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20">
              IA
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-gray-200 mb-0.5">Designed & Developed by Mr. Irshad Ansari ❤</div>
              <div className="text-xs text-gray-500 font-medium">Pusa Institute of Technology · Made with love from India</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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