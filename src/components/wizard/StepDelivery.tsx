import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import { Info, Truck, Ship, Plane, MapPin, Package, Globe } from "lucide-react";
import { DEFAULT_DESTINATIONS } from "@/constants";

export function StepDelivery() {
  const { estimation, updateDelivery } = useEstimationStore();
  const d = estimation.delivery;

  const selectedDest = DEFAULT_DESTINATIONS.find(dest => dest.id === d.destinationId);

  return (
    <div className="space-y-6 animate-in">
      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Delivery & Freight</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Select the delivery destination and freight mode. Sea freight is most economical for overseas.
            Advance copies are typically sent by air courier. All rates are in INR and converted to your chosen currency.
          </p>
        </div>
      </div>

      {/* Destination Selection */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Destination
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DEFAULT_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              onClick={() => updateDelivery({
                destinationId: dest.id,
                destinationName: dest.name,
              })}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                d.destinationId === dest.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                  : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
              )}
            >
              <div className="flex items-center gap-2">
                {dest.isOverseas ? (
                  <Globe className="w-4 h-4 text-blue-500" />
                ) : (
                  <MapPin className="w-4 h-4 text-green-500" />
                )}
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{dest.name}</p>
              </div>
              <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">{dest.country}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Terms */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Delivery Terms & Mode
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Incoterm / Delivery Type</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { type: "fob" as const, label: "FOB", desc: "Free On Board" },
                { type: "cif" as const, label: "CIF", desc: "Cost, Insurance, Freight" },
                { type: "ddp" as const, label: "DDP", desc: "Delivered Duty Paid" },
                { type: "ex_works" as const, label: "Ex Works", desc: "Factory pickup" },
                { type: "domestic" as const, label: "Domestic", desc: "India delivery" },
              ]).map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => updateDelivery({ deliveryType: type })}
                  className={cn(
                    "p-2 rounded-lg border-2 text-left transition-all",
                    d.deliveryType === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary"
                  )}
                >
                  <p className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary">{label}</p>
                  <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Freight Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { type: "sea" as const, label: "Sea Freight", icon: <Ship className="w-4 h-4" /> },
                { type: "air" as const, label: "Air Freight", icon: <Plane className="w-4 h-4" /> },
                { type: "road" as const, label: "Road", icon: <Truck className="w-4 h-4" /> },
                { type: "courier" as const, label: "Courier", icon: <Package className="w-4 h-4" /> },
              ]).map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => updateDelivery({ freightMode: type })}
                  className={cn(
                    "p-3 rounded-lg border-2 flex items-center gap-2 transition-all",
                    d.freightMode === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary"
                  )}
                >
                  {icon}
                  <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Freight Details */}
      {selectedDest && (
        <div className="card p-5 space-y-4 animate-in">
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Freight Details — {selectedDest.name}
          </h3>

          {selectedDest.isOverseas && d.freightMode === "sea" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
              <div>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Sea Freight (20ft)</p>
                <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">${selectedDest.seaFreightPerContainer20}</p>
              </div>
              <div>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Per Pallet</p>
                <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">${selectedDest.seaFreightPerPallet}</p>
              </div>
              <div>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Clearance</p>
                <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">₹{selectedDest.clearanceCharges.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Surface per Pallet</p>
                <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">₹{selectedDest.surfacePerPallet.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">No. of Despatches</label>
              <input
                type="number"
                min={1}
                value={d.numberOfDespatches}
                onChange={(e) => updateDelivery({ numberOfDespatches: parseInt(e.target.value) || 1 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Port of Loading</label>
              <input
                type="text"
                value={d.portOfLoading}
                onChange={(e) => updateDelivery({ portOfLoading: e.target.value })}
                placeholder="e.g., JNPT Mumbai"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Customs Clearance (₹)</label>
              <input
                type="number"
                value={d.customsClearance || selectedDest.clearanceCharges}
                onChange={(e) => updateDelivery({ customsClearance: parseFloat(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Insurance Rate (%)</label>
              <input
                type="number"
                value={d.insuranceRate || selectedDest.insurancePercent}
                onChange={(e) => updateDelivery({ insuranceRate: parseFloat(e.target.value) || 0 })}
                className="input-field"
                step="0.1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Advance Copies */}
      <div className="card p-5 space-y-4">
        <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
          Advance Copies
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Number of Advance Copies</label>
            <input
              type="number"
              min={0}
              value={d.advanceCopies}
              onChange={(e) => updateDelivery({ advanceCopies: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Send by Air Freight</label>
            <div className="mt-1">
              <button
                onClick={() => updateDelivery({ advanceCopiesAirFreight: !d.advanceCopiesAirFreight })}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 text-sm transition-all",
                  d.advanceCopiesAirFreight
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
                    : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary text-text-light-secondary dark:text-text-dark-secondary"
                )}
              >
                {d.advanceCopiesAirFreight ? "✓ Yes, Air Courier" : "No"}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Air Freight Rate (₹/kg)</label>
            <input
              type="number"
              value={d.advanceCopiesRate || 900}
              onChange={(e) => updateDelivery({ advanceCopiesRate: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
        </div>
      </div>
    </div>
  );
}