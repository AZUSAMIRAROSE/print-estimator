import { cn } from "@/utils/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Toggle({ checked, onChange, label, description, disabled, size = "md" }: ToggleProps) {
  return (
    <label className={cn("flex items-center gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600",
          size === "sm" ? "h-5 w-9" : "h-6 w-11"
        )}
      >
        <span
          className={cn(
            "inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200",
            size === "sm" ? "h-4 w-4 mt-0.5 ml-0.5" : "h-5 w-5 mt-0.5 ml-0.5",
            checked && (size === "sm" ? "translate-x-4" : "translate-x-5")
          )}
        />
      </button>
      {(label || description) && (
        <div>
          {label && (
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {label}
            </span>
          )}
          {description && (
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{description}</p>
          )}
        </div>
      )}
    </label>
  );
}