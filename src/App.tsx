import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
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

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

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
        <Route path="/estimate/:id" element={<NewEstimate />} />
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