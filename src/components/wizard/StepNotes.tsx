import { useEstimationStore } from "@/stores/estimationStore";
import { Info, MessageSquare, Lock } from "lucide-react";

export function StepNotes() {
  const { estimation, updateEstimation } = useEstimationStore();

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Notes & Instructions</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Add external notes (visible on quotation) and internal notes (for your team only).
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Quotation Notes (Visible to Customer)
          </h3>
        </div>
        <textarea
          rows={5}
          value={estimation.notes}
          onChange={(e) => updateEstimation({ notes: e.target.value })}
          placeholder="Enter notes that will appear on the quotation... e.g., special printing requirements, delivery instructions, terms..."
          className="input-field resize-y"
        />
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Internal Notes (Team Only)
          </h3>
        </div>
        <textarea
          rows={5}
          value={estimation.internalNotes}
          onChange={(e) => updateEstimation({ internalNotes: e.target.value })}
          placeholder="Internal notes for your team... e.g., pricing strategy, competitive info, production notes..."
          className="input-field resize-y"
        />
      </div>
    </div>
  );
}