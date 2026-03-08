// ============================================================================
// NEW ESTIMATE V2 PAGE — Integration of the new wizard system
// ============================================================================

import React, { useEffect } from "react";
import { WizardShell } from "@/components/wizard/v2";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";

/**
 * NewEstimateV2 page component
 *
 * Integrates the new WizardShell with existing Zustand stores to provide
 * inventory and rate card data for auto-planning.
 *
 * The wizard state is persisted to localStorage automatically.
 */
export function NewEstimateV2() {
  // Get the wizard store
  const setDataSources = useWizardStore((state) => state.setDataSources);

  // Get data from existing stores
  const inventory = useInventoryStore((state) => state.items || []);
  const rateCard = useRateCardStore((state) => state.paperRates || []);

  // Inject data sources into wizard store whenever they change
  useEffect(() => {
    setDataSources(inventory, rateCard);
  }, [inventory, rateCard, setDataSources]);

  return (
    <div className="h-screen bg-white dark:bg-gray-950">
      <WizardShell />
    </div>
  );
}

export default NewEstimateV2;
