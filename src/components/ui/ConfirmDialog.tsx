import { Modal } from "./Modal";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmText = "Confirm", cancelText = "Cancel",
  variant = "warning", loading
}: ConfirmDialogProps) {
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-danger-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning-500" />,
    info: <Info className="w-6 h-6 text-info-500" />,
  };

  const buttonClasses = {
    danger: "bg-danger-600 hover:bg-danger-700 text-white",
    warning: "bg-warning-600 hover:bg-warning-700 text-white",
    info: "bg-primary-600 hover:bg-primary-700 text-white",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-12 h-12 rounded-full bg-surface-light-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center mb-4">
          {icons[variant]}
        </div>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
          {title}
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
          {message}
        </p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            disabled={loading}
            className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors", buttonClasses[variant])}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}