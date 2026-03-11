import React from "react";
import { cn } from "@/utils/cn";
import { type LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode | LucideIcon;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "default" | "pills" | "underline";
}

export function Tabs({ tabs, activeTab, onChange, variant = "default" }: TabsProps) {
  const renderIcon = (InputIcon: React.ReactNode | LucideIcon) => {
    if (!InputIcon) return null;
    if (typeof InputIcon === 'function') {
      const Comp = InputIcon as LucideIcon;
      return <Comp className="w-4 h-4" />;
    }
    return InputIcon as React.ReactNode;
  };

  return (
    <div
      className={cn(
        "flex gap-1",
        variant === "underline" && "border-b border-surface-light-border dark:border-surface-dark-border gap-0"
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200",
            variant === "default" && [
              "rounded-lg",
              activeTab === tab.id
                ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
                : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary",
            ],
            variant === "pills" && [
              "rounded-full",
              activeTab === tab.id
                ? "bg-primary-600 text-white"
                : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary",
            ],
            variant === "underline" && [
              "border-b-2 -mb-px rounded-none px-5 py-3",
              activeTab === tab.id
                ? "border-primary-600 dark:border-primary-400 text-primary-700 dark:text-primary-400"
                : "border-transparent text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:border-gray-300 dark:hover:border-gray-600",
            ]
          )}
        >
          {renderIcon(tab.icon)}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                activeTab === tab.id
                  ? variant === "pills"
                    ? "bg-white/20 text-white"
                    : "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}