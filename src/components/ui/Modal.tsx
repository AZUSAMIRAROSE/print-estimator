import React, { useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
  showClose?: boolean;
}

export function Modal({ isOpen, onClose, title, subtitle, size = "md", children, footer, showClose = true }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const sizeClass = useMemo(() => {
    const sizeClasses = {
      sm: "max-w-md",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      "2xl": "max-w-6xl",
      full: "max-w-[95vw]",
    };
    return sizeClasses[size];
  }, [size]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className={cn("w-full rounded-2xl bg-white dark:bg-surface-dark-secondary border border-surface-light-border dark:border-surface-dark-border shadow-2xl animate-scale-in flex flex-col max-h-[90vh]", sizeClass)}>
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-light-border dark:border-surface-dark-border flex-shrink-0">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
              >
                <X className="w-5 h-5 text-text-light-tertiary dark:text-text-dark-tertiary" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-light-border dark:border-surface-dark-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}