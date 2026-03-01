import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { SIDEBAR_ITEMS, APP_NAME, APP_VERSION } from "@/constants";
import {
  LayoutDashboard, FilePlus, Briefcase, FileCheck, Users,
  CreditCard, Calculator, Warehouse, BarChart3, Settings,
  ChevronLeft, ChevronRight, Printer
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, FilePlus, Briefcase, FileCheck, Users,
  CreditCard, Calculator, Warehouse, BarChart3, Settings,
};

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300",
        "bg-white dark:bg-surface-dark-secondary border-r border-surface-light-border dark:border-surface-dark-border",
        sidebarCollapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-surface-light-border dark:border-surface-dark-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Printer className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 animate-fade-in">
              <h1 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary truncate">
                {APP_NAME}
              </h1>
              <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
                v{APP_VERSION}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary",
                isActive
                  ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
                  : "text-text-light-secondary dark:text-text-dark-secondary",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-text-light-tertiary dark:text-text-dark-tertiary"
                )}
              />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && !sidebarCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-surface-light-border dark:border-surface-dark-border">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-text-light-tertiary dark:text-text-dark-tertiary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}