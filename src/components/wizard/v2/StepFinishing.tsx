// ============================================================================
// STEP 7: FINISHING — Lamination, UV, embossing, foil, die-cutting
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { SectionCard } from "./shared/SectionCard";

import { cn } from "@/utils/cn";

export function StepFinishing() {
  const { estimation, setEstimationField } = useWizardStore();
  const finishing = estimation.finishing;

  const toggleFinishing = (key: string, enabled: boolean, defaults?: Record<string, unknown>) => {
    if (enabled) {
      setEstimationField(`finishing.${key}`, defaults ?? true);
    } else {
      setEstimationField(`finishing.${key}`, undefined);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Lamination */}
      <SectionCard
        title="Lamination"
        icon="✨"
        enabled={!!finishing.lamination}
        onToggle={(enabled) =>
          toggleFinishing("lamination", enabled, { type: "GLOSS", sides: 1 })
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper sectionId="__finishing__" fieldName="laminationType" label="Type">
            <div className="flex gap-2">
              {(["GLOSS", "MATT", "SOFT_TOUCH"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEstimationField("finishing.lamination.type", type)}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium rounded-lg border transition-all",
                    finishing.lamination?.type === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400",
                  )}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </FieldWrapper>

          <FieldWrapper sectionId="__finishing__" fieldName="laminationSides" label="Sides">
            <select
              value={finishing.lamination?.sides ?? 1}
              onChange={(e) => setEstimationField("finishing.lamination.sides", parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              <option value={1}>1 side (front only)</option>
              <option value={2}>2 sides (front + back)</option>
            </select>
          </FieldWrapper>
        </div>
      </SectionCard>

      {/* UV Varnish */}
      <SectionCard
        title="UV Varnish"
        icon="🔆"
        enabled={!!finishing.uvVarnish}
        onToggle={(enabled) => toggleFinishing("uvVarnish", enabled)}
      >
        <p className="text-xs text-gray-500">Full flood UV coating on cover</p>
      </SectionCard>

      {/* Spot UV */}
      <SectionCard
        title="Spot UV"
        icon="💎"
        enabled={!!finishing.spotUV}
        onToggle={(enabled) =>
          toggleFinishing("spotUV", enabled, { coveragePercent: 15 })
        }
      >
        <FieldWrapper sectionId="__finishing__" fieldName="spotUVCoverage" label="Coverage %">
          <input
            type="number"
            value={finishing.spotUV?.coveragePercent ?? 15}
            onChange={(e) => setEstimationField("finishing.spotUV.coveragePercent", parseInt(e.target.value) || 15)}
            min={5}
            max={80}
            className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>
      </SectionCard>

      {/* Embossing */}
      <SectionCard
        title="Embossing"
        icon="🏔️"
        enabled={!!finishing.embossing}
        onToggle={(enabled) =>
          toggleFinishing("embossing", enabled, { type: "SINGLE_LEVEL" })
        }
      >
        <FieldWrapper sectionId="__finishing__" fieldName="embossingType" label="Type">
          <div className="flex gap-2">
            {(["SINGLE_LEVEL", "MULTI_LEVEL"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEstimationField("finishing.embossing.type", type)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded-lg border transition-all",
                  finishing.embossing?.type === type
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
                )}
              >
                {type.replace("_", " ")}
              </button>
            ))}
          </div>
        </FieldWrapper>
      </SectionCard>

      {/* Foil Stamping */}
      <SectionCard
        title="Foil Stamping"
        icon="⭐"
        enabled={!!finishing.foilStamping}
        onToggle={(enabled) =>
          toggleFinishing("foilStamping", enabled, { area_cm2: 50, foilType: "gold" })
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper sectionId="__finishing__" fieldName="foilArea" label="Area (cm²)">
            <input
              type="number"
              value={finishing.foilStamping?.area_cm2 ?? 50}
              onChange={(e) => setEstimationField("finishing.foilStamping.area_cm2", parseInt(e.target.value) || 50)}
              min={1}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
            />
          </FieldWrapper>

          <FieldWrapper sectionId="__finishing__" fieldName="foilType" label="Foil Color">
            <select
              value={finishing.foilStamping?.foilType ?? "gold"}
              onChange={(e) => setEstimationField("finishing.foilStamping.foilType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="copper">Copper</option>
              <option value="holographic">Holographic</option>
            </select>
          </FieldWrapper>
        </div>
      </SectionCard>

      {/* Die Cutting */}
      <SectionCard
        title="Die Cutting"
        icon="✂️"
        enabled={!!finishing.dieCutting}
        onToggle={(enabled) =>
          toggleFinishing("dieCutting", enabled, { complexity: "SIMPLE" })
        }
      >
        <FieldWrapper sectionId="__finishing__" fieldName="dieCutComplexity" label="Complexity">
          <div className="flex gap-2">
            {(["SIMPLE", "COMPLEX"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEstimationField("finishing.dieCutting.complexity", type)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded-lg border transition-all",
                  finishing.dieCutting?.complexity === type
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </FieldWrapper>
      </SectionCard>
    </div>
  );
}
