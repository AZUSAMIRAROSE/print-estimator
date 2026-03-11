import React from "react";
import { cn } from "@/utils/cn";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: React.ReactNode | LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-light-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center mb-4 text-text-light-tertiary dark:text-text-dark-tertiary">
        {typeof Icon === 'function' ? (React.createElement(Icon as LucideIcon, { className: "w-8 h-8" })) : (Icon as React.ReactNode)}
      </div>
      <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}