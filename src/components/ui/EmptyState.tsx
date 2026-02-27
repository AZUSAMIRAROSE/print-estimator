import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-light-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center mb-4 text-text-light-tertiary dark:text-text-dark-tertiary">
        {icon}
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