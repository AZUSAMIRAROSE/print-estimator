import { cn } from "@/utils/cn";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default" | "primary";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success: "bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500",
  warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-500",
  danger: "bg-danger-50 text-danger-700 dark:bg-danger-500/20 dark:text-danger-500",
  info: "bg-info-50 text-info-700 dark:bg-info-500/20 dark:text-info-500",
  primary: "bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
  primary: "bg-primary-500",
  default: "bg-gray-500",
};

export function Badge({ children, variant = "default", size = "sm", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}