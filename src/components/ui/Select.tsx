import { cn } from "@/utils/cn";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  tip?: string;
}

export function Select({ id, name, value, onChange, options, placeholder, label, error, disabled, className, tip }: SelectProps) {
  const selectId = id ?? name;
  const errorId = selectId ? `${selectId}-error` : undefined;

  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={selectId}>
          {label}
          {tip && (
            <span className="ml-1 text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary font-normal">
              — {tip}
            </span>
          )}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error && errorId ? errorId : undefined}
        className={cn(
          "input-field appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px] bg-[right_8px_center] bg-no-repeat pr-9",
          error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} className="text-xs text-danger-500 mt-1" role="alert">{error}</p>}
    </div>
  );
}
