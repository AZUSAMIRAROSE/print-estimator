import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { getRelativeTime, getInitials } from "@/utils/format";
import {
  Search, Bell, Sun, Moon, LogOut, User, Settings,
  ChevronDown, Check, FileText, Download, Upload,
  Package, Briefcase, AlertCircle, X, ExternalLink
} from "lucide-react";
import type { AppNotification } from "@/types";

const NOTIF_ICON_MAP: Record<string, React.ReactNode> = {
  estimate: <FileText className="w-4 h-4" />,
  quotation: <Package className="w-4 h-4" />,
  job: <Briefcase className="w-4 h-4" />,
  export: <Download className="w-4 h-4" />,
  import: <Upload className="w-4 h-4" />,
  system: <AlertCircle className="w-4 h-4" />,
  customer: <User className="w-4 h-4" />,
};

const NOTIF_COLOR_MAP: Record<string, string> = {
  info: "bg-info-50 text-info-600 dark:bg-info-500/20 dark:text-info-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400",
  error: "bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400",
  action: "bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400",
};

export function Header() {
  const navigate = useNavigate();
  const {
    user, theme, toggleTheme, setSearchOpen,
    notifications, unreadCount,
    markNotificationRead, markAllNotificationsRead, clearNotifications,
    logout
  } = useAppStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [setSearchOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/");
  };

  return (
    <header className="h-16 border-b border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary flex items-center justify-between px-6 shrink-0 z-20">
      {/* Search Bar */}
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-3 px-4 py-2 w-full max-w-md rounded-xl border border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-tertiary hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors group"
      >
        <Search className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary group-hover:text-primary-500 transition-colors" />
        <span className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
          Search anything...
        </span>
        <div className="ml-auto flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white dark:bg-surface-dark-secondary border border-surface-light-border dark:border-surface-dark-border rounded text-text-light-tertiary dark:text-text-dark-tertiary">
            Ctrl
          </kbd>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white dark:bg-surface-dark-secondary border border-surface-light-border dark:border-surface-dark-border rounded text-text-light-tertiary dark:text-text-dark-tertiary">
            K
          </kbd>
        </div>
      </button>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors relative group"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
          ) : (
            <Sun className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
          )}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2.5 rounded-xl hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-soft">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] flex flex-col card-elevated overflow-hidden animate-scale-in z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-light-border dark:border-surface-dark-border shrink-0">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-danger-500 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline px-2 py-1"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="p-1 text-text-light-tertiary dark:text-text-dark-tertiary hover:text-danger-500 transition-colors"
                      title="Clear all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="w-8 h-8 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-2" />
                    <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">No notifications</p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onRead={() => markNotificationRead(notif.id)}
                      onNavigate={(url) => {
                        setNotifOpen(false);
                        if (url) navigate(url);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {user?.initials || "U"}
            </div>
            {user && (
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate max-w-[120px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary truncate">
                  {user.role}
                </p>
              </div>
            )}
            <ChevronDown className={cn(
              "w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary transition-transform",
              profileOpen && "rotate-180"
            )} />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 card-elevated py-2 animate-scale-in z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-surface-light-border dark:border-surface-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold">
                    {user?.initials || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/profile-settings"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Application Settings
                </button>
              </div>

              <div className="border-t border-surface-light-border dark:border-surface-dark-border pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ notification, onRead, onNavigate }: {
  notification: AppNotification;
  onRead: () => void;
  onNavigate: (url?: string) => void;
}) {
  return (
    <button
      onClick={() => {
        if (!notification.read) onRead();
        onNavigate(notification.actionUrl);
      }}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-surface-light-border/50 dark:border-surface-dark-border/50 last:border-0",
        notification.read
          ? "hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary"
          : "bg-primary-50/50 dark:bg-primary-500/5 hover:bg-primary-50 dark:hover:bg-primary-500/10"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-lg shrink-0 mt-0.5",
        NOTIF_COLOR_MAP[notification.type] || NOTIF_COLOR_MAP.info
      )}>
        {NOTIF_ICON_MAP[notification.category] || <Bell className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm truncate",
            notification.read
              ? "text-text-light-secondary dark:text-text-dark-secondary"
              : "text-text-light-primary dark:text-text-dark-primary font-medium"
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
          {getRelativeTime(notification.timestamp)}
        </p>
      </div>
      {notification.actionUrl && (
        <ExternalLink className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0 mt-1" />
      )}
    </button>
  );
}