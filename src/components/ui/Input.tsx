import { forwardRef } from "react";
import { cn } from "@/utils/cn";
import { AlertCircle, Info } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  tip?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, tip, icon, suffix, className, ...props }, ref) => {
    const inputId = props.id ?? props.name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    return (
      <div className={className}>
        {label && (
          <label className="label" htmlFor={inputId}>
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
            {tip && (
              <span className="ml-1 text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary font-normal inline-flex items-center gap-0.5">
                <Info className="w-3 h-3" />
                {tip}
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light-tertiary dark:text-text-dark-tertiary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error && errorId ? errorId : undefined}
            className={cn(
              "input-field",
              icon && "pl-10",
              suffix && "pr-12",
              error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-danger-500 mt-1" role="alert">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
