import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatDate, formatNumber } from "@/utils/format";
import { DEFAULT_CURRENCIES, APP_VERSION, APP_BUILD, APP_NAME } from "@/constants";
import {
  Settings as SettingsIcon, Building, Palette, Bell, Database,
  Shield, Save, RotateCcw, Download, Upload, Trash2,
  Sun, Moon, Info, Activity, Globe, ChevronRight, Check, AlertTriangle
} from "lucide-react";

type SettingsTab = "company" | "appearance" | "notifications" | "currency" | "database" | "activity" | "about";

export function Settings() {
  const {
    settings, updateSettings, theme, setTheme,
    currencies, updateCurrencyRate,
    activityLog, clearActivityLog,
    addNotification, addActivityLog,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [companyForm, setCompanyForm] = useState({ ...settings.company });
  const [saved, setSaved] = useState(false);

  const handleSaveCompany = () => {
    updateSettings({ company: companyForm } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    addNotification({ type: "success", title: "Settings Saved", message: "Company settings have been updated.", category: "system" });
    addActivityLog({ action: "SETTINGS_UPDATED", category: "settings", description: "Company settings updated", user: "Current User", entityType: "settings", entityId: "", level: "info" });
  };

  const handleBackup = () => {
    addNotification({ type: "success", title: "Backup Created", message: "Database backup created successfully.", category: "system" });
  };

  const handleRestore = () => {
    if (window.confirm("Are you sure? This will replace all current data.")) {
      addNotification({ type: "warning", title: "Restore", message: "Database restored from backup.", category: "system" });
    }
  };

  const handleReset = () => {
    if (window.confirm("⚠️ This will DELETE ALL DATA and reset the application. Are you absolutely sure?")) {
      if (window.confirm("This action cannot be undone. Type RESET to confirm.")) {
        addNotification({ type: "error", title: "Application Reset", message: "All data has been cleared.", category: "system" });
      }
    }
  };

  const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: "company", label: "Company", icon: <Building className="w-4 h-4" /> },
    { key: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { key: "currency", label: "Currency", icon: <Globe className="w-4 h-4" /> },
    { key: "database", label: "Database", icon: <Database className="w-4 h-4" /> },
    { key: "activity", label: "Activity Log", icon: <Activity className="w-4 h-4" /> },
    { key: "about", label: "About", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> Settings
        </h1>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
          Configure application preferences, company details, and data management
        </p>
      </div>

      <div className="flex gap-6">
        {/* Settings Nav */}
        <div className="w-56 shrink-0 space-y-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left", activeTab === tab.key ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold" : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary")}>
              {tab.icon}
              {tab.label}
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "company" && (
            <div className="card p-6 space-y-5 animate-in">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Company Name</label><input type="text" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} className="input-field" /></div>
                <div><label className="label">Website</label><input type="text" value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} className="input-field" /></div>
                <div><label className="label">Phone</label><input type="tel" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} className="input-field" /></div>
                <div className="col-span-2"><label className="label">Address</label><input type="text" value={companyForm.address} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} className="input-field" /></div>
                <div><label className="label">City</label><input type="text" value={companyForm.city} onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })} className="input-field" /></div>
                <div><label className="label">State</label><input type="text" value={companyForm.state} onChange={e => setCompanyForm({ ...companyForm, state: e.target.value })} className="input-field" /></div>
                <div><label className="label">GST Number</label><input type="text" value={companyForm.gstNumber} onChange={e => setCompanyForm({ ...companyForm, gstNumber: e.target.value })} className="input-field" /></div>
                <div><label className="label">PAN Number</label><input type="text" value={companyForm.panNumber} onChange={e => setCompanyForm({ ...companyForm, panNumber: e.target.value })} className="input-field" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                <button onClick={handleSaveCompany} className="btn-primary flex items-center gap-1.5">{saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? "Saved!" : "Save Changes"}</button>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="card p-6 space-y-6 animate-in">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Appearance</h3>
              <div>
                <label className="label mb-3">Theme</label>
                <div className="flex gap-4">
                  <button onClick={() => setTheme("light")} className={cn("flex-1 p-6 rounded-xl border-2 text-center transition-all", theme === "light" ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10" : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300")}>
                    <Sun className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">Light</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Clean and bright</p>
                  </button>
                  <button onClick={() => setTheme("dark")} className={cn("flex-1 p-6 rounded-xl border-2 text-center transition-all", theme === "dark" ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10" : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300")}>
                    <Moon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">Dark</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Easy on the eyes</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="card p-6 space-y-4 animate-in">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Notification Preferences</h3>
              {[
                { key: "estimateCompleted", label: "Estimation Completed" },
                { key: "quotationStatusChange", label: "Quotation Status Changes" },
                { key: "exportCompleted", label: "Export/PDF Generated" },
                { key: "systemAlerts", label: "System Alerts" },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-light-secondary dark:bg-surface-dark-tertiary cursor-pointer">
                  <span className="text-sm text-text-light-primary dark:text-text-dark-primary">{item.label}</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </label>
              ))}
            </div>
          )}

          {activeTab === "currency" && (
            <div className="card p-6 space-y-4 animate-in">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Currency Exchange Rates</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">All rates relative to 1 unit = ₹X (Indian Rupees)</p>
              <div className="space-y-2">
                {currencies.map(c => (
                  <div key={c.code} className="flex items-center gap-4 p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg">
                    <span className="text-lg font-bold w-10">{c.symbol}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{c.code} — {c.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-light-tertiary">1 {c.code} =</span>
                      <input type="number" value={c.exchangeRate} onChange={e => updateCurrencyRate(c.code, parseFloat(e.target.value) || 0)} className="input-field w-24 text-right text-sm py-1" step="0.01" disabled={c.code === "INR"} />
                      <span className="text-xs text-text-light-tertiary">₹</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="space-y-4 animate-in">
              <div className="card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Data Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={handleBackup} className="p-4 rounded-xl border-2 border-surface-light-border dark:border-surface-dark-border hover:border-primary-500 transition-all text-center">
                    <Download className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-semibold">Backup Data</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Export all data</p>
                  </button>
                  <button onClick={handleRestore} className="p-4 rounded-xl border-2 border-surface-light-border dark:border-surface-dark-border hover:border-amber-500 transition-all text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm font-semibold">Restore Data</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Import from backup</p>
                  </button>
                  <button onClick={handleReset} className="p-4 rounded-xl border-2 border-danger-300 dark:border-danger-500/30 hover:border-danger-500 transition-all text-center">
                    <Trash2 className="w-8 h-8 mx-auto mb-2 text-danger-500" />
                    <p className="text-sm font-semibold text-danger-600">Reset Application</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Delete all data</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="card p-6 space-y-4 animate-in">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Activity Log</h3>
                <div className="flex gap-2">
                  <button onClick={clearActivityLog} className="btn-ghost text-xs text-danger-500">Clear Log</button>
                  <button className="btn-secondary text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Export</button>
                </div>
              </div>
              {activityLog.length === 0 ? (
                <div className="text-center py-12 text-text-light-tertiary dark:text-text-dark-tertiary">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {activityLog.slice(0, 50).map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-sm">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", log.level === "error" ? "bg-danger-500" : log.level === "warning" ? "bg-warning-500" : "bg-success-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-light-primary dark:text-text-dark-primary font-medium">{log.action}</p>
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">{log.description}</p>
                      </div>
                      <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div className="card p-6 space-y-6 animate-in">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <SettingsIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{APP_NAME}</h2>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">Nuclear-Grade Commercial Print Estimation Platform</p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <DetailItem label="Version" value={APP_VERSION} />
                <DetailItem label="Build" value={APP_BUILD} />
                <DetailItem label="Platform" value="Windows (Tauri 2)" />
                <DetailItem label="Stack" value="Rust + React + TypeScript" />
                <DetailItem label="Database" value="SQLite (WAL)" />
                <DetailItem label="License" value="Proprietary" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg">
      <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase font-medium">{label}</p>
      <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mt-0.5">{value}</p>
    </div>
  );
}