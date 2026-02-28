import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/format";
import {
  User, Shield, Palette, Camera, Save, Check, LogOut,
  ChevronRight, Mail, Phone, Building, Briefcase, Clock,
  Calendar, Globe, Hash, DollarSign, FileText, Bell,
  ToggleLeft, ToggleRight, Key, Monitor, Smartphone
} from "lucide-react";
import type { CurrencyCode } from "@/types";

type ProfileTab = "personal" | "avatar" | "preferences" | "security";

const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: "INR", label: "₹ INR — Indian Rupee" },
  { code: "USD", label: "$ USD — US Dollar" },
  { code: "GBP", label: "£ GBP — British Pound" },
  { code: "EUR", label: "€ EUR — Euro" },
  { code: "AUD", label: "A$ AUD — Australian Dollar" },
  { code: "CAD", label: "C$ CAD — Canadian Dollar" },
  { code: "SGD", label: "S$ SGD — Singapore Dollar" },
  { code: "AED", label: "د.إ AED — UAE Dirham" },
  { code: "ZAR", label: "R ZAR — South African Rand" },
  { code: "JPY", label: "¥ JPY — Japanese Yen" },
  { code: "CNY", label: "¥ CNY — Chinese Yuan" },
  { code: "HKD", label: "HK$ HKD — Hong Kong Dollar" },
  { code: "BRL", label: "R$ BRL — Brazilian Real" },
];

const DATE_FORMATS = [
  "DD/MMM/YYYY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "MMM DD, YYYY",
];

const NUMBER_FORMATS = [
  { value: "en-IN", label: "Indian (1,23,456.78)" },
  { value: "en-US", label: "US (123,456.78)" },
  { value: "en-GB", label: "UK (123,456.78)" },
  { value: "de-DE", label: "German (123.456,78)" },
  { value: "fr-FR", label: "French (123 456,78)" },
];

export function ProfileSettings() {
  const navigate = useNavigate();
  const {
    user, updateUser, theme, setTheme, logout,
    addNotification, addActivityLog,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [saved, setSaved] = useState(false);

  // Personal info form
  const [personalForm, setPersonalForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    designation: user?.designation || "",
    department: user?.department || "",
    company: user?.company || "",
  });

  // Preferences form
  const [prefsForm, setPrefsForm] = useState({
    currency: user?.preferences?.currency || "GBP" as CurrencyCode,
    language: user?.preferences?.language || "en",
    dateFormat: user?.preferences?.dateFormat || "DD/MMM/YYYY",
    numberFormat: user?.preferences?.numberFormat || "en-IN",
    defaultMargin: user?.preferences?.defaultMargin ?? 25,
    defaultTaxRate: user?.preferences?.defaultTaxRate ?? 0,
    quotationValidity: user?.preferences?.quotationValidity ?? 15,
    autoSaveDraft: user?.preferences?.autoSaveDraft ?? true,
    showTips: user?.preferences?.showTips ?? true,
    notificationsEnabled: user?.preferences?.notificationsEnabled ?? true,
  });

  const handleSavePersonal = () => {
    const newInitials = getInitials(personalForm.name || "User");
    updateUser({
      ...personalForm,
      initials: newInitials,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    addNotification({ type: "success", title: "Profile Updated", message: "Your personal information has been saved.", category: "system" });
    addActivityLog({ action: "PROFILE_UPDATED", category: "settings", description: "Personal profile information updated", user: personalForm.name || "User", entityType: "settings", entityId: "", level: "info" });
  };

  const handleSavePreferences = () => {
    updateUser({
      preferences: {
        theme,
        sidebarCollapsed: user?.preferences?.sidebarCollapsed ?? false,
        ...prefsForm,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    addNotification({ type: "success", title: "Preferences Saved", message: "Your preferences have been updated.", category: "system" });
    addActivityLog({ action: "PREFERENCES_UPDATED", category: "settings", description: "User preferences updated", user: user?.name || "User", entityType: "settings", entityId: "", level: "info" });
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout? You will need to go through onboarding again.")) {
      logout();
      navigate("/");
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addNotification({ type: "error", title: "File too large", message: "Avatar image must be less than 2MB.", category: "system" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUser({ avatar: reader.result as string });
        addNotification({ type: "success", title: "Avatar Updated", message: "Your profile picture has been updated.", category: "system" });
        addActivityLog({ action: "AVATAR_UPDATED", category: "settings", description: "User avatar updated", user: user?.name || "User", entityType: "settings", entityId: "", level: "info" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    updateUser({ avatar: undefined });
    addNotification({ type: "success", title: "Avatar Removed", message: "Your profile picture has been removed.", category: "system" });
  };

  const TABS: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: "personal", label: "Personal Info", icon: <User className="w-4 h-4" /> },
    { key: "avatar", label: "Avatar & Display", icon: <Camera className="w-4 h-4" /> },
    { key: "preferences", label: "Preferences", icon: <Palette className="w-4 h-4" /> },
    { key: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-light-tertiary dark:text-text-dark-tertiary">No user profile found. Please complete onboarding.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header Card with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 p-6 shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZWMzRoNnptMC0zMHY2aC02VjRoNnptMCAxMHY2aC02VjE0aDZ6bTAgMTB2Nmg2djZoLTZWMjR6bS0xMCAwdjZoLTZ2LTZoNnptLTEwIDB2NmgtNnYtNmg2em0yMCAwdjZoNnY2aC02VjI0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="relative flex items-center gap-5">
          <div className="w-20 h-20 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold shadow-lg border border-white/20 overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user.initials || "U"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{user.name}</h1>
            <p className="text-white/80 text-sm mt-0.5">{user.designation} • {user.department}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <Briefcase className="w-3 h-3" />
                {user.role}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/70 text-xs">
                <Building className="w-3 h-3" />
                {user.company}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="w-56 shrink-0 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                activeTab === tab.key
                  ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold"
                  : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
              )}
            >
              {tab.icon}
              {tab.label}
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ─── Personal Info ─────────────────────────────────────────── */}
          {activeTab === "personal" && (
            <div className="card p-6 space-y-5 animate-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10">
                  <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Personal Information</h3>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Update your personal details and contact information</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
                  <input
                    type="text"
                    value={personalForm.name}
                    onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</label>
                  <input
                    type="email"
                    value={personalForm.email}
                    onChange={e => setPersonalForm({ ...personalForm, email: e.target.value })}
                    className="input-field"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</label>
                  <input
                    type="tel"
                    value={personalForm.phone}
                    onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                    className="input-field"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Company</label>
                  <input
                    type="text"
                    value={personalForm.company}
                    onChange={e => setPersonalForm({ ...personalForm, company: e.target.value })}
                    className="input-field"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Designation</label>
                  <input
                    type="text"
                    value={personalForm.designation}
                    onChange={e => setPersonalForm({ ...personalForm, designation: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Senior Estimator"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Department</label>
                  <select
                    value={personalForm.department}
                    onChange={e => setPersonalForm({ ...personalForm, department: e.target.value })}
                    className="input-field"
                  >
                    <option>Sales</option>
                    <option>Production</option>
                    <option>Pre-Press</option>
                    <option>Accounts</option>
                    <option>Management</option>
                    <option>IT</option>
                    <option>HR</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                <button onClick={handleSavePersonal} className="btn-primary flex items-center gap-1.5">
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* ─── Avatar & Display ──────────────────────────────────────── */}
          {activeTab === "avatar" && (
            <div className="space-y-4 animate-in">
              {/* Avatar Card */}
              <div className="card p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10">
                    <Camera className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Avatar & Display</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Your profile avatar and display information</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-6 rounded-xl bg-gradient-to-r from-surface-light-secondary to-surface-light-tertiary dark:from-surface-dark-tertiary dark:to-surface-dark-secondary">
                  <div className="relative group w-24 h-24 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.initials || "U"
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">{user.name}</h4>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{user.email || "No email set"}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 text-xs font-semibold">
                        <Briefcase className="w-3 h-3" />
                        {user.role}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                        <Building className="w-3 h-3" />
                        {user.company}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  <p>
                    Click on your avatar to upload a custom image (max 2MB), or let it auto-generate from your initials.
                  </p>
                  {user.avatar && (
                    <button onClick={handleRemoveAvatar} className="text-danger-500 hover:text-danger-600 font-medium whitespace-nowrap">
                      Remove Avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Details */}
              <div className="card p-6 space-y-4">
                <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">Profile Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ProfileDetailRow icon={<User className="w-4 h-4" />} label="Full Name" value={user.name} />
                  <ProfileDetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={user.email || "—"} />
                  <ProfileDetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={user.phone || "—"} />
                  <ProfileDetailRow icon={<Briefcase className="w-4 h-4" />} label="Designation" value={user.designation} />
                  <ProfileDetailRow icon={<Building className="w-4 h-4" />} label="Department" value={user.department} />
                  <ProfileDetailRow icon={<Building className="w-4 h-4" />} label="Company" value={user.company} />
                  <ProfileDetailRow icon={<Calendar className="w-4 h-4" />} label="Member Since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                  <ProfileDetailRow icon={<Clock className="w-4 h-4" />} label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} />
                </div>
              </div>
            </div>
          )}

          {/* ─── Preferences ───────────────────────────────────────────── */}
          {activeTab === "preferences" && (
            <div className="space-y-4 animate-in">
              {/* Display Preferences */}
              <div className="card p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <Palette className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Display Preferences</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Customize how the application looks and displays data</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Theme</label>
                    <select
                      value={theme}
                      onChange={e => setTheme(e.target.value as "light" | "dark")}
                      className="input-field"
                    >
                      <option value="light">☀️ Light Mode</option>
                      <option value="dark">🌙 Dark Mode</option>
                    </select>
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Language</label>
                    <select
                      value={prefsForm.language}
                      onChange={e => setPrefsForm({ ...prefsForm, language: e.target.value })}
                      className="input-field"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date Format</label>
                    <select
                      value={prefsForm.dateFormat}
                      onChange={e => setPrefsForm({ ...prefsForm, dateFormat: e.target.value })}
                      className="input-field"
                    >
                      {DATE_FORMATS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Number Format</label>
                    <select
                      value={prefsForm.numberFormat}
                      onChange={e => setPrefsForm({ ...prefsForm, numberFormat: e.target.value })}
                      className="input-field"
                    >
                      {NUMBER_FORMATS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Estimation Defaults */}
              <div className="card p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Estimation Defaults</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Default values used when creating new estimates</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Default Currency</label>
                    <select
                      value={prefsForm.currency}
                      onChange={e => setPrefsForm({ ...prefsForm, currency: e.target.value as CurrencyCode })}
                      className="input-field"
                    >
                      {CURRENCY_OPTIONS.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Default Margin %</label>
                    <input
                      type="number"
                      value={prefsForm.defaultMargin}
                      onChange={e => setPrefsForm({ ...prefsForm, defaultMargin: parseFloat(e.target.value) || 0 })}
                      className="input-field"
                      min={0}
                      max={100}
                      step={0.5}
                    />
                  </div>
                  <div>
                    <label className="label">Default Tax Rate %</label>
                    <input
                      type="number"
                      value={prefsForm.defaultTaxRate}
                      onChange={e => setPrefsForm({ ...prefsForm, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                      className="input-field"
                      min={0}
                      max={50}
                      step={0.5}
                    />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Quotation Validity (days)</label>
                    <input
                      type="number"
                      value={prefsForm.quotationValidity}
                      onChange={e => setPrefsForm({ ...prefsForm, quotationValidity: parseInt(e.target.value) || 15 })}
                      className="input-field"
                      min={1}
                      max={365}
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/10">
                    <ToggleLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Behavior</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Control auto-save, tips, and notification behavior</p>
                  </div>
                </div>

                <ToggleRow
                  icon={<Save className="w-4 h-4" />}
                  label="Auto-save Drafts"
                  description="Automatically save estimation drafts as you work"
                  checked={prefsForm.autoSaveDraft}
                  onChange={v => setPrefsForm({ ...prefsForm, autoSaveDraft: v })}
                />
                <ToggleRow
                  icon={<Smartphone className="w-4 h-4" />}
                  label="Show Tips & Hints"
                  description="Display helpful tips and tooltips throughout the app"
                  checked={prefsForm.showTips}
                  onChange={v => setPrefsForm({ ...prefsForm, showTips: v })}
                />
                <ToggleRow
                  icon={<Bell className="w-4 h-4" />}
                  label="Enable Notifications"
                  description="Receive in-app notifications for important events"
                  checked={prefsForm.notificationsEnabled}
                  onChange={v => setPrefsForm({ ...prefsForm, notificationsEnabled: v })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={handleSavePreferences} className="btn-primary flex items-center gap-1.5">
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Preferences"}
                </button>
              </div>
            </div>
          )}

          {/* ─── Security ──────────────────────────────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-4 animate-in">
              {/* Session Info */}
              <div className="card p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10">
                    <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Session Information</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Current session and account details</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                      <span className="text-[10px] uppercase font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Logged in as</span>
                    </div>
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{user.name}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                      <span className="text-[10px] uppercase font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Role</span>
                    </div>
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{user.role}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                      <span className="text-[10px] uppercase font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Account Created</span>
                    </div>
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                      <span className="text-[10px] uppercase font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Last Login</span>
                    </div>
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                    <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Password & Authentication</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Manage your password and authentication settings</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary border border-surface-light-border dark:border-surface-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">Password Protection</p>
                      <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                        This is a local application. Authentication is managed through your system credentials.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400 text-xs font-semibold">
                      Secured
                    </span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card p-6 space-y-4 border-danger-200 dark:border-danger-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-danger-50 dark:bg-danger-500/10">
                    <LogOut className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-danger-600 dark:text-danger-400">Danger Zone</h3>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Irreversible actions — proceed with caution</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border-2 border-dashed border-danger-200 dark:border-danger-500/20 bg-danger-50/50 dark:bg-danger-500/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">Logout</p>
                      <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">
                        Sign out and return to the onboarding screen. All data is preserved.
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ──────────────────────────────────────────────────── */

function ProfileDetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-light-secondary dark:bg-surface-dark-tertiary">
      <div className="text-text-light-tertiary dark:text-text-dark-tertiary">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-medium text-text-light-tertiary dark:text-text-dark-tertiary">{label}</p>
        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">{value}</p>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, description, checked, onChange }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary cursor-pointer hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-secondary transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-text-light-tertiary dark:text-text-dark-tertiary">{icon}</div>
        <div>
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none",
          checked ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"
        )}
      >
        <span className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-5"
        )} />
      </button>
    </label>
  );
}
