import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { setApiToken } from "@/api/client";
import { MainLayout } from "@/layouts/MainLayout";
import { OnboardingScreen } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { NewEstimate } from "@/pages/NewEstimate";
import { Jobs } from "@/pages/Jobs";
import { Quotations } from "@/pages/Quotations";
import { Customers } from "@/pages/Customers";
import { RateCard } from "@/pages/RateCard";
import { Calculator } from "@/pages/Calculator";
import { Inventory } from "@/pages/Inventory";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { ProfileSettings } from "@/pages/ProfileSettings";

export default function App() {
  const { isOnboarded, theme } = useAppStore();
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

  useEffect(() => {
    setApiToken(localStorage.getItem("print-estimator-api-token") || "");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N - New Estimate
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        navigate("/estimate/new");
      }
      // Ctrl+S or Cmd+S - Save (handled by stores)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        // Trigger save action
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Not onboarded — show onboarding
  if (!isOnboarded) {
    return <OnboardingScreen />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/estimate/new" element={<NewEstimate />} />
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
  );
}
