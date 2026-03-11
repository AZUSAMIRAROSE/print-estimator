import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import { Info, FileImage, Eye } from "lucide-react";
import { EPSON_PROOF_RATE, WET_PROOF_RATE } from "@/constants";

export function StepPrePress() {
  const { estimation, updatePrePress } = useEstimationStore();
  const pp = estimation.prePress;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Pre-Press & Origination</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Pre-press includes proofing (Epson or wet machine proofs) and origination. Most modern jobs assume ready-to-print PDFs.
            Epson proofs are ₹{EPSON_PROOF_RATE}/page. Wet proofs (on press): ₹{WET_PROOF_RATE.toLocaleString()}/form.
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
          <FileImage className="w-5 h-5" />
          Origination Type
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { type: "from_pdf" as const, label: "From PDF", desc: "Ready-to-print PDF files" },
            { type: "from_positives" as const, label: "From Positives", desc: "Film positives provided" },
            { type: "from_design" as const, label: "From Design", desc: "Design/DTP work required" },
          ]).map(({ type, label, desc }) => (
            <button
              key={type}
              onClick={() => updatePrePress({ originationType: type })}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all",
                pp.originationType === type
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                  : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
              )}
            >
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
              <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Proofing
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Epson Proofs (pages)</label>
            <input
              type="number"
              min={0}
              value={pp.epsonProofs}
              onChange={(e) => updatePrePress({ epsonProofs: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Epson Rate (₹/page)</label>
            <input
              type="number"
              value={pp.epsonRatePerPage}
              onChange={(e) => updatePrePress({ epsonRatePerPage: parseFloat(e.target.value) || EPSON_PROOF_RATE })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Wet Proofs (forms)</label>
            <input
              type="number"
              min={0}
              value={pp.wetProofs}
              onChange={(e) => updatePrePress({ wetProofs: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Wet Proof Rate (₹/form)</label>
            <input
              type="number"
              value={pp.wetProofRatePerForm}
              onChange={(e) => updatePrePress({ wetProofRatePerForm: parseFloat(e.target.value) || WET_PROOF_RATE })}
              className="input-field"
            />
          </div>
        </div>

        {pp.originationType === "from_design" && (
          <div className="animate-in">
            <label className="label">Design / DTP Charges (₹)</label>
            <input
              type="number"
              value={pp.designCharges}
              onChange={(e) => updatePrePress({ designCharges: parseFloat(e.target.value) || 0 })}
              className="input-field w-48"
              placeholder="Enter total design charges"
            />
          </div>
        )}

        {/* Cost Summary */}
        <div className="p-4 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">Pre-Press Cost Summary</p>
          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
            <div>
              <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Epson:</span>{" "}
              <span className="font-medium">₹{(pp.epsonProofs * pp.epsonRatePerPage).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Wet:</span>{" "}
              <span className="font-medium">₹{(pp.wetProofs * pp.wetProofRatePerForm).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Design:</span>{" "}
              <span className="font-medium">₹{(pp.designCharges || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-surface-light-border dark:border-surface-dark-border">
            <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Total Pre-Press:</span>{" "}
            <span className="font-bold text-primary-600 dark:text-primary-400">
              ₹{((pp.epsonProofs * pp.epsonRatePerPage) + (pp.wetProofs * pp.wetProofRatePerForm) + (pp.designCharges || 0)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}