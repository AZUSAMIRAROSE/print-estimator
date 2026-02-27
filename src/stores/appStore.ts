import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { 
  UserProfile, AppNotification, ActivityLog, AppSettings,
  CurrencyRate 
} from "@/types";
import { DEFAULT_CURRENCIES, APP_VERSION } from "@/constants";
import { generateId, getInitials } from "@/utils/format";

interface AppState {
  // User
  user: UserProfile | null;
  isOnboarded: boolean;
  
  // Theme
  theme: "light" | "dark";
  
  // Sidebar
  sidebarCollapsed: boolean;
  
  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  
  // Activity Log
  activityLog: ActivityLog[];
  
  // Search
  searchQuery: string;
  searchOpen: boolean;
  
  // Currencies
  currencies: CurrencyRate[];
  
  // Settings
  settings: AppSettings;
  
  // Modal
  activeModal: string | null;
  modalData: unknown;
  
  // Actions
  setUser: (user: UserProfile) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  completeOnboarding: (user: Partial<UserProfile>) => void;
  
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  
  addActivityLog: (log: Omit<ActivityLog, "id" | "timestamp">) => void;
  clearActivityLog: () => void;
  
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  
  updateCurrencyRate: (code: string, rate: number) => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      user: null,
      isOnboarded: false,
      theme: "light",
      sidebarCollapsed: false,
      notifications: [],
      unreadCount: 0,
      activityLog: [],
      searchQuery: "",
      searchOpen: false,
      currencies: DEFAULT_CURRENCIES,
      activeModal: null,
      modalData: null,
      
      settings: {
        company: {
          name: "Thomson Press India Pvt Ltd.",
          logo: "",
          address: "Post Box No.705, Delhi-Mathura Road",
          city: "Faridabad",
          state: "Haryana",
          country: "India",
          pincode: "121007",
          phone: "+91 120 4886311",
          email: "info@thomsonpress.com",
          website: "www.thomsonpress.com",
          gstNumber: "",
          panNumber: "",
          registrationNumber: "",
          bankDetails: "",
        },
        estimation: {
          defaultCurrency: "GBP",
          defaultMarginPercent: 25,
          defaultTaxRate: 0,
          quotationValidity: 15,
          defaultPaymentTerms: "L/C at Sight",
          bleedMM: 3,
          gripperMM: 12,
          autoCalculateSpine: true,
          includeAdvanceCopies: true,
          defaultAdvanceCopies: 10,
          roundPriceTo: 3,
        },
        printing: {
          defaultMachine: "rmgt",
          enablePerfectorCalc: true,
          enableBiblePaperSurcharge: true,
          wastageChartId: "default",
          defaultImpositionMethod: "auto",
        },
        appearance: {
          theme: "light",
          accentColor: "blue",
          fontSize: "medium",
          sidebarWidth: "normal",
          compactMode: false,
          animationsEnabled: true,
        },
        notifications: {
          enabled: true,
          soundEnabled: false,
          estimateCompleted: true,
          quotationStatusChange: true,
          exportCompleted: true,
          systemAlerts: true,
        },
        backup: {
          autoBackup: true,
          backupInterval: "daily",
          maxBackups: 10,
          lastBackup: "",
          backupPath: "",
        },
      },
      
      // ── User Actions ──────────────────────────────────────────────────────
      setUser: (user) => set((state) => {
        state.user = user;
        state.isOnboarded = true;
      }),
      
      updateUser: (updates) => set((state) => {
        if (state.user) {
          Object.assign(state.user, updates);
        }
      }),
      
      logout: () => set((state) => {
        state.user = null;
        state.isOnboarded = false;
      }),
      
      completeOnboarding: (userData) => set((state) => {
        const now = new Date().toISOString();
        state.user = {
          id: generateId(),
          name: userData.name || "User",
          email: userData.email || "",
          role: userData.role || "Estimator",
          company: userData.company || "Thomson Press",
          phone: userData.phone || "",
          avatar: "",
          designation: userData.designation || "Estimator",
          department: userData.department || "Sales",
          initials: getInitials(userData.name || "User"),
          createdAt: now,
          lastLogin: now,
          preferences: {
            theme: state.theme,
            currency: "GBP",
            language: "en",
            dateFormat: "DD/MMM/YYYY",
            numberFormat: "en-IN",
            defaultMargin: 25,
            defaultTaxRate: 0,
            quotationValidity: 15,
            autoSaveDraft: true,
            showTips: true,
            sidebarCollapsed: false,
            notificationsEnabled: true,
          },
        };
        state.isOnboarded = true;
        
        // Add welcome notification
        state.notifications.unshift({
          id: generateId(),
          type: "success",
          title: "Welcome to Print Estimator Pro!",
          message: `Hello ${userData.name}, your account has been set up successfully.`,
          category: "system",
          read: false,
          timestamp: now,
        });
        state.unreadCount = 1;
      }),
      
      // ── Theme Actions ─────────────────────────────────────────────────────
      toggleTheme: () => set((state) => {
        state.theme = state.theme === "light" ? "dark" : "light";
        state.settings.appearance.theme = state.theme;
      }),
      
      setTheme: (theme) => set((state) => {
        state.theme = theme;
        state.settings.appearance.theme = theme;
      }),
      
      // ── Sidebar Actions ───────────────────────────────────────────────────
      toggleSidebar: () => set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      }),
      
      setSidebarCollapsed: (collapsed) => set((state) => {
        state.sidebarCollapsed = collapsed;
      }),
      
      // ── Notification Actions ──────────────────────────────────────────────
      addNotification: (notification) => set((state) => {
        const newNotif: AppNotification = {
          ...notification,
          id: generateId(),
          read: false,
          timestamp: new Date().toISOString(),
        };
        state.notifications.unshift(newNotif);
        state.unreadCount = state.notifications.filter(n => !n.read).length;
        
        // Keep only last 100 notifications
        if (state.notifications.length > 100) {
          state.notifications = state.notifications.slice(0, 100);
        }
      }),
      
      markNotificationRead: (id) => set((state) => {
        const notif = state.notifications.find(n => n.id === id);
        if (notif) notif.read = true;
        state.unreadCount = state.notifications.filter(n => !n.read).length;
      }),
      
      markAllNotificationsRead: () => set((state) => {
        state.notifications.forEach(n => { n.read = true; });
        state.unreadCount = 0;
      }),
      
      clearNotifications: () => set((state) => {
        state.notifications = [];
        state.unreadCount = 0;
      }),
      
      // ── Activity Log Actions ──────────────────────────────────────────────
      addActivityLog: (log) => set((state) => {
        const entry: ActivityLog = {
          ...log,
          id: generateId(),
          timestamp: new Date().toISOString(),
        };
        state.activityLog.unshift(entry);
        
        // Keep only last 1000 entries
        if (state.activityLog.length > 1000) {
          state.activityLog = state.activityLog.slice(0, 1000);
        }
      }),
      
      clearActivityLog: () => set((state) => {
        state.activityLog = [];
      }),
      
      // ── Search Actions ────────────────────────────────────────────────────
      setSearchQuery: (query) => set((state) => {
        state.searchQuery = query;
      }),
      
      setSearchOpen: (open) => set((state) => {
        state.searchOpen = open;
      }),
      
      // ── Currency Actions ──────────────────────────────────────────────────
      updateCurrencyRate: (code, rate) => set((state) => {
        const currency = state.currencies.find(c => c.code === code);
        if (currency) {
          currency.exchangeRate = rate;
          currency.updatedAt = new Date().toISOString();
        }
      }),
      
      // ── Settings Actions ──────────────────────────────────────────────────
      updateSettings: (updates) => set((state) => {
        Object.assign(state.settings, updates);
      }),
      
      // ── Modal Actions ─────────────────────────────────────────────────────
      openModal: (modalId, data) => set((state) => {
        state.activeModal = modalId;
        state.modalData = data;
      }),
      
      closeModal: () => set((state) => {
        state.activeModal = null;
        state.modalData = null;
      }),
    })),
    {
      name: "print-estimator-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isOnboarded: state.isOnboarded,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        notifications: state.notifications.slice(0, 50),
        unreadCount: state.unreadCount,
        currencies: state.currencies,
        settings: state.settings,
        activityLog: state.activityLog.slice(0, 200),
      }),
    }
  )
);