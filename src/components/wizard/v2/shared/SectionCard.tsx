// ============================================================================
// SECTION CARD — Reusable card for each material section
// ============================================================================

import React from "react";
import { cn } from "@/utils/cn";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  icon,
  enabled = true,
  onToggle,
  children,
  className,
  actions,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        enabled
          ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-60",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-800">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {onToggle && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-xs text-gray-500">
                {enabled ? "ON" : "OFF"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => onToggle(!enabled)}
                className={cn(
                  "relative w-9 h-5 rounded-full transition-colors",
                  enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    enabled && "translate-x-4",
                  )}
                />
              </button>
            </label>
          )}
        </div>
      </div>

      {/* Content */}
      {enabled && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

