// ============================================================================
// STEP 9: DELIVERY — Incoterms, freight mode, destination
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { cn } from "@/utils/cn";

const DELIVERY_TYPES = [
  { value: "ex_works", label: "Ex-Works", description: "Customer collects from factory" },
  { value: "fob", label: "FOB", description: "Free on Board — to port/airport" },
  { value: "cif", label: "CIF", description: "Cost, Insurance & Freight — to destination" },
  { value: "ddp", label: "DDP", description: "Delivered Duty Paid — to door" },
];

const FREIGHT_MODES = [
  { value: "road", label: "Road", description: "Domestic truck", icon: "🚛" },
  { value: "sea", label: "Sea", description: "Container shipping", icon: "🚢" },
  { value: "air", label: "Air", description: "Air freight", icon: "✈️" },
  { value: "courier", label: "Courier", description: "Express courier", icon: "📦" },
];

export function StepDelivery() {
  const { estimation, setEstimationField } = useWizardStore();

  const delivery = estimation.delivery ?? {
    deliveryType: "fob",
    freightMode: "sea",
    destination: "",
    destinationCity: "",
    destinationCountry: "United Kingdom",
  };

  const update = (field: string, value: unknown) => {
    setEstimationField(`delivery.${field}`, value);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Delivery type (Incoterms) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Delivery Terms</h3>
        <div className="grid grid-cols-2 gap-3">
          {DELIVERY_TYPES.map((dt) => (
            <button
              key={dt.value}
              type="button"
              onClick={() => update("deliveryType", dt.value)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                delivery.deliveryType === dt.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-200 dark:ring-blue-800"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-900",
              )}
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dt.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Freight mode */}
      {delivery.deliveryType !== "ex_works" && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Freight Mode</h3>
          <div className="grid grid-cols-4 gap-2">
            {FREIGHT_MODES.map((fm) => (
              <button
                key={fm.value}
                type="button"
                onClick={() => update("freightMode", fm.value)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-all",
                  delivery.freightMode === fm.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-900",
                )}
              >
                <p className="text-lg">{fm.icon}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{fm.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Destination */}
      {delivery.deliveryType !== "ex_works" && (
        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper sectionId="__delivery__" fieldName="destinationCity" label="Destination City">
            <input
              type="text"
              value={delivery.destinationCity}
              onChange={(e) => update("destinationCity", e.target.value)}
              placeholder="e.g., London"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </FieldWrapper>

          <FieldWrapper sectionId="__delivery__" fieldName="destinationCountry" label="Country">
            <input
              type="text"
              value={delivery.destinationCountry}
              onChange={(e) => update("destinationCountry", e.target.value)}
              placeholder="e.g., United Kingdom"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </FieldWrapper>
        </div>
      )}
    </div>
  );
}
