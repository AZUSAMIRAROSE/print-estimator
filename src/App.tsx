import { useEffect, useCallback, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useEstimationStore } from "@/stores/estimationStore";
import { setApiToken } from "@/api/client";
import { MainLayout } from "@/layouts/MainLayout";
import { OnboardingScreen } from "@/pages/Onboarding";
import { Loader2 } from "lucide-react";

// ── Route-level code splitting ─────────────────────────────────────────────
// Each page is lazy-loaded so the initial bundle only contains the shell,
// dashboard, and core framework code. Heavy pages (estimation, reports,
// quotations) are fetched on-demand.
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const NewEstimate = lazy(() => import("@/pages/NewEstimate").then(m => ({ default: m.NewEstimate })));
const NewEstimateV2 = lazy(() => import("@/pages/NewEstimateV2"));
const Jobs = lazy(() => import("@/pages/Jobs").then(m => ({ default: m.Jobs })));
const Quotations = lazy(() => import("@/pages/Quotations").then(m => ({ default: m.Quotations })));
const Customers = lazy(() => import("@/pages/Customers").then(m => ({ default: m.Customers })));
const RateCard = lazy(() => import("@/pages/RateCard").then(m => ({ default: m.RateCard })));
const Calculator = lazy(() => import("@/pages/Calculator").then(m => ({ default: m.Calculator })));
const Inventory = lazy(() => import("@/pages/Inventory").then(m => ({ default: m.Inventory })));
const Reports = lazy(() => import("@/pages/Reports").then(m => ({ default: m.Reports })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings").then(m => ({ default: m.ProfileSettings })));

// ── Suspense fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
          Loading page...
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { isOnboarded, theme, addNotification } = useAppStore();
  const navigate = useNavigate();

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Restore tokens
  useEffect(() => {
    const token = localStorage.getItem("print-estimator-api-token") || "";
    const refresh = localStorage.getItem("print-estimator-refresh-token") || "";
    setApiToken(token, refresh);
  }, []);

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    // Force-persist all Zustand stores (they use localStorage middleware)
    const estimation = useEstimationStore.getState().estimation;
    if (estimation) {
      useEstimationStore.getState().updateEstimation({
        updatedAt: new Date().toISOString(),
      });
    }

    addNotification({
      type: "success",
      title: "Saved",
      message: "All changes have been saved to local storage.",
      category: "system",
    });
  }, [addNotification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N - New Estimate
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        navigate("/estimate/new");
      }
      // Ctrl+S or Cmd+S - Save current work
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+K or Cmd+K - Open search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        useAppStore.getState().setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, handleSave]);

  // Not onboarded — show onboarding
  if (!isOnboarded) {
    return <OnboardingScreen />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/estimate/new" element={<NewEstimate />} />
          <Route path="/estimate/v2" element={<NewEstimateV2 />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/rate-card" element={<RateCard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
