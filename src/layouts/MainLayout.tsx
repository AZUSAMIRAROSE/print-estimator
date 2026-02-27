import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { SIDEBAR_ITEMS, APP_NAME, APP_VERSION } from "@/constants";
import { Header } from "@/components/layout/Header";
import {
  LayoutDashboard, FilePlus, Briefcase, FileCheck, Users,
  CreditCard, Calculator, Warehouse, BarChart3, Settings,
  ChevronLeft, ChevronRight, Printer
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  FilePlus: <FilePlus className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  FileCheck: <FileCheck className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  Calculator: <Calculator className="w-5 h-5" />,
  Warehouse: <Warehouse className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
};

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full z-30 flex flex-col border-r transition-all duration-300",
        "bg-white dark:bg-surface-dark-secondary border-surface-light-border dark:border-surface-dark-border",
        sidebarCollapsed ? "w-[68px]" : "w-[252px]"
      )}
    >
      {/* Logo Area */}
      <div className="flex items-center h-16 px-4 border-b border-surface-light-border dark:border-surface-dark-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-md">
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
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative",
                sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold shadow-sm"
                  : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              )}
            >
              <div className={cn(
                "shrink-0 transition-colors",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-text-light-tertiary dark:text-text-dark-tertiary group-hover:text-text-light-secondary dark:group-hover:text-text-dark-secondary"
              )}>
                {ICON_MAP[item.icon] || <LayoutDashboard className="w-5 h-5" />}
              </div>

              {!sidebarCollapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}

              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-600 dark:bg-primary-400 rounded-r-full" />
              )}

              {/* Tooltip for collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-gray-900 dark:border-r-gray-100" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-surface-light-border dark:border-surface-dark-border p-2.5 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-text-light-tertiary dark:text-text-dark-tertiary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function MainLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-surface-light-primary dark:bg-surface-dark-primary">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-[68px]" : "ml-[252px]"
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
