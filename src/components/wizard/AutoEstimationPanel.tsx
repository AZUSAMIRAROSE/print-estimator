/**
 * WIZARD UI INTEGRATION
 * Shows how to wire the New Estimate wizard with the new estimation system
 * This can be used as a guide for updating NewEstimate.tsx or creating a new estimation flow
 */

import { useState } from "react";
import { useEstimationWorkflow, useEstimationState } from "@/hooks/useEstimationWorkflow";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { extractPaperSourcesFromStores } from "@/domain/estimation/adapters/storeAdapters";
import { STANDARD_MACHINES } from "@/domain/estimation/imposition/constants";
import type { EstimationRequest } from "@/domain/estimation/imposition/types";
import type { QuotationOptions } from "@/domain/estimation/pricing/quotationGenerator";

/**
 * Component: Auto Estimation Panel
 * Integrated into the New Estimate wizard
 */
interface AutoEstimationPanelProps {
  onEstimationComplete?: () => void;
}

export const AutoEstimationPanel = ({ 
  onEstimationComplete 
}: AutoEstimationPanelProps) => {
  // Hooks
  const { estimateFromRequest, generateQuotationForEstimation, cancel } = 
    useEstimationWorkflow({ onComplete: onEstimationComplete });
  const { progress, progressMessage, error, estimation, quotation, isLoading, isComplete } = 
    useEstimationState();

  // Store access
  const inventoryState = useInventoryStore.getState();
  const rateCardState = useRateCardStore.getState();
  const { papers, rates } = extractPaperSourcesFromStores(inventoryState, rateCardState);

  // Local form state
  const [showAutoplan, setShowAutoplan] = useState(false);
  const [quotationOptions, setQuotationOptions] = useState<QuotationOptions>({
    marginPercent: 25,
    gstPercent: 18,
    currency: "INR",
    paymentTerms: "L/C at Sight",
    validityDays: 15,
  });

  // Handler: Build request from wizard form data
  // This would extract from the existing form fields
  const handleAutoEstimate = async (wizardData: any) => {
    // Convert wizard EstimationInput to EstimationRequest
    const request: EstimationRequest = {
      sections: [
        // Text sections
        ...(wizardData.textSections?.filter((s: any) => s.enabled) || []).map((section: any) => ({
          type: "text" as const,
          pages: section.pages,
          colorsFront: section.colorsFront,
          colorsBack: section.colorsBack,
          paperPreference: "cost-optimized" as const,
        })),
        // Cover
        ...(wizardData.cover?.enabled
          ? [{
              type: "cover" as const,
              pages: wizardData.cover.pages,
              colorsFront: wizardData.cover.colorsFront,
              colorsBack: wizardData.cover.colorsBack,
              paperPreference: "quality-optimized" as const,
            }]
          : []),
        // Jacket
        ...(wizardData.jacket?.enabled
          ? [{
              type: "jacket" as const,
              pages: 4,
              colorsFront: wizardData.jacket.colorsFront,
              colorsBack: wizardData.jacket.colorsBack,
              paperPreference: "quality-optimized" as const,
            }]
          : []),
      ],
      totalPages: wizardData.bookSpec?.totalPages || 0,
      quantity: wizardData.quantities?.[0] || 0,
      paperPreference: "cost-optimized",
      machinePreference: "speed",
    };

    // Run the estimation
    await estimateFromRequest(request, papers, STANDARD_MACHINES);
    setShowAutoplan(true);
  };

  return (
    <div className="space-y-4">
      {/* Auto-Plan Button */}
      <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="font-bold text-lg mb-2">🚀 Smart Auto-Planning</h3>
        <p className="text-sm text-gray-700 mb-4">
          Let our AI engine automatically optimize your imposition, paper sourcing, and machine selection.
          Saves you hours of manual planning!
        </p>
        <button
          onClick={() => {
            // Get form data from parent component or store
            const estimationStore = useInventoryStore.getState();
            handleAutoEstimate(estimationStore);
          }}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? `${progress}% - ${progressMessage}` : "Start Auto-Planning"}
        </button>

        {isLoading && (
          <div className="mt-4 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-medium text-gray-700">{progressMessage}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg font-semibold">
            ❌ Error: {error}
            <button
              onClick={cancel}
              className="ml-4 underline text-red-900 hover:text-red-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Estimation Results */}
      {isComplete && estimation && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="border rounded-lg p-4 bg-green-50">
            <h3 className="font-bold text-lg mb-4 text-green-900">✅ Estimation Complete</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Selected Imposition */}
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-xs text-gray-600 font-semibold">IMPOSITION</p>
                <p className="text-lg font-bold">{estimation.selectedImposition.sheetSize}</p>
                <p className="text-xs text-gray-700 mt-1">
                  Waste: {estimation.selectedImposition.wastePercentage.toFixed(1)}%
                </p>
              </div>

              {/* Selected Machine */}
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-xs text-gray-600 font-semibold">MACHINE</p>
                <p className="text-lg font-bold">{estimation.selectedMachine.name}</p>
                <p className="text-xs text-gray-700 mt-1">
                  Speed: {estimation.selectedMachine.sheetSpeed} sheets/hr
                </p>
              </div>

              {/* Selected Paper */}
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-xs text-gray-600 font-semibold">PAPER SOURCE</p>
                <p className="text-lg font-bold">{estimation.selectedPaper?.name || "N/A"}</p>
                <p className="text-xs text-gray-700 mt-1">
                  {estimation.selectedPaper?.supplier || "From inventory"}
                </p>
              </div>

              {/* Estimated Price */}
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-xs text-gray-600 font-semibold">BASE PRICE</p>
                <p className="text-lg font-bold">₹{estimation.estimatedPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-700 mt-1">
                  Per copy: ₹{(estimation.estimatedPrice / (estimation.quantity || 1)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white p-3 rounded border border-green-200 mb-4">
              <p className="text-xs text-gray-600 font-semibold mb-2">COST BREAKDOWN</p>
              <div className="space-y-1 text-sm">
                {estimation.costBreakdown && Object.entries(estimation.costBreakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-gray-700">
                    <span className="capitalize">{key}:</span>
                    <span className="font-semibold">₹{(value as number).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Show Alternative Impositions */}
            {estimation.impositionCandidates && estimation.impositionCandidates.length > 1 && (
              <details className="bg-white p-3 rounded border border-green-200 cursor-pointer">
                <summary className="text-sm font-semibold text-gray-700">
                  View {estimation.impositionCandidates.length} Alternative Options
                </summary>
                <div className="mt-3 space-y-2">
                  {estimation.impositionCandidates.slice(1).map((candidate, idx) => (
                    <div key={idx} className="text-xs text-gray-600 flex justify-between p-2 bg-gray-50 rounded">
                      <span>{candidate.sheetSize} ({candidate.wastePercentage.toFixed(1)}% waste)</span>
                      <span>₹{candidate.estimatedPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Quotation Generation Section */}
          <div className="border rounded-lg p-4 bg-purple-50">
            <h3 className="font-bold text-lg mb-4 text-purple-900">📋 Generate Customer Quotation</h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Margin %</label>
                <input
                  type="number"
                  value={quotationOptions.marginPercent || 25}
                  onChange={(e) => setQuotationOptions({
                    ...quotationOptions,
                    marginPercent: parseFloat(e.target.value) || 25
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GST %</label>
                <input
                  type="number"
                  value={quotationOptions.gstPercent || 18}
                  onChange={(e) => setQuotationOptions({
                    ...quotationOptions,
                    gstPercent: parseFloat(e.target.value) || 18
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                <select
                  value={quotationOptions.currency || "INR"}
                  onChange={(e) => setQuotationOptions({
                    ...quotationOptions,
                    currency: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option>INR</option>
                  <option>GBP</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Validity (Days)</label>
                <input
                  type="number"
                  value={quotationOptions.validityDays || 15}
                  onChange={(e) => setQuotationOptions({
                    ...quotationOptions,
                    validityDays: parseInt(e.target.value) || 15
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <button
              onClick={() => generateQuotationForEstimation(quotationOptions)}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            >
              {quotation ? "Update & Refresh Quotation" : "Generate Quotation"}
            </button>
          </div>

          {/* Generated Quotation Display */}
          {quotation && (
            <div className="border rounded-lg p-4 bg-yellow-50">
              <h3 className="font-bold text-lg mb-4 text-yellow-900">💰 Quotation Generated</h3>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span>Quotation ID:</span>
                  <span className="font-mono font-semibold">{quotation.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span>₹{quotation.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Margin ({quotation.marginPercent}%):</span>
                  <span>₹{quotation.marginAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{quotation.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>GST (18%):</span>
                  <span>₹{quotation.taxAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Final Price:</span>
                  <span>{quotation.currency} {quotation.finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700">
                  📧 Send Email
                </button>
                <button className="px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700">
                  📑 Export PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Complete example of integrating auto-planning into the New Estimate wizard
 * Replace or wrap the existing EstimationResults component with this
 */
export const NewEstimateWizardWithAutoPlan = () => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Step 1: Basic Info & Specs (existing wizard steps 0-5) */}
      {currentStep < 6 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step {currentStep + 1}: Book Specifications</h2>
          {/* Embed existing wizard UI here */}
        </div>
      )}

      {/* Step 2: Auto Planning (new) */}
      {currentStep === 6 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step 7: Auto-Plan & Quotation</h2>
          <AutoEstimationPanel
            onEstimationComplete={() => setCurrentStep(7)}
          />
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {currentStep === 7 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Step 8: Review & Submit</h2>
          {/* Final review before saving */}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          className="px-4 py-2 border border-gray-300 rounded"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
};
