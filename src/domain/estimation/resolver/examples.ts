/**
 * Integration Example - Auto-Planning with Real Data
 * 
 * Shows how to use the complete estimation pipeline:
 * 1. Prepare request with desired specifications
 * 2. Gather live data from inventory and rate card stores
 * 3. Call autoPlan() to get complete estimation
 * 4. Use results for quotation generation
 */

import { autoPlan, validateEstimationRequest } from "@/domain/estimation/resolver";
import type {
  EstimationRequest,
  TextSection,
  CoverSection,
  Dimensions,
} from "@/domain/estimation/imposition";

// ============================================================================
// EXAMPLE 1: Simple Book Estimation
// ============================================================================

/**
 * Example estimation request for a 192-page book with cover
 */
export function createExampleRequest(): EstimationRequest {
  const trimSize: Dimensions = { width: 153, height: 234 }; // Crown 6×9"

  const textSection: TextSection = {
    type: "text",
    pageCounts: { front: 192, back: 0 },
    colors: { frontColor: "4color", backColor: "black" },
    trimSize,
  };

  const coverSection: CoverSection = {
    type: "cover",
    trimSize,
    spineWidth: 12,
    bleedAllowance: 3,
    colors: { frontColor: "4color", backColor: "4color" },
  };

  return {
    jobId: "EST-2026-001",
    quantity: 1000,
    trimSize,
    sections: {
      text: textSection,
      cover: coverSection,
      jacket: undefined,
      endleaf: undefined,
    },
    papers: {
      text: {
        id: "paper-custom",
        name: "Matt Art Paper",
        gsm: 80,
        bulkFactor: 1.4,
        grain: "long",
        availableSheets: [],
        basePrice: 2800,
        availability: "in_stock",
      },
      cover: {
        id: "paper-cover",
        name: "Art Card",
        gsm: 300,
        bulkFactor: 0.6,
        grain: "long",
        availableSheets: [],
        basePrice: 8500,
        availability: "in_stock",
      },
      jacket: undefined,
      endleaf: undefined,
    },
    machines: undefined, // Will use defaults
    preferences: {
      maxWastePercentage: 30, // Tight waste control
      allowNonCompliantGrain: false,
    },
  };
}

/**
 * Example showing how to integrate with store data
 */
export async function estimateWithLiveData() {
  // In a real app, these would come from your Zustand stores
  // const inventoryItems = useInventoryStore((s) => s.items).filter((i) => i.category === "paper");
  // const rateCards = useRateCardStore((s) => s.paperRates);

  // Simulated data for this example
  const inventoryItems = [
    {
      id: "inv-1",
      name: "Matt Art Paper 80gsm",
      sku: "PAP-MA-080",
      category: "paper" as const,
      subcategory: "Art Paper",
      stock: 350,
      unit: "Reams",
      costPerUnit: 2800,
      sellingPrice: 3200,
      supplier: "JK Paper",
      leadTimeDays: 7,
      weight: 25,
      tags: ["long-grain"],
    },
    {
      id: "inv-4",
      name: "Art Card 300gsm",
      sku: "PAP-AC-300",
      category: "paper" as const,
      subcategory: "Card Board",
      stock: 85,
      unit: "Reams",
      costPerUnit: 8500,
      sellingPrice: 9500,
      supplier: "ITC",
      leadTimeDays: 14,
      weight: 75,
      tags: ["long-grain"],
    },
  ];

  const rateCardEntries = [
    {
      id: "rate-1",
      paperType: "Matt Art Paper",
      gsm: 80,
      size: "25x36",
      landedCost: 2800,
      chargeRate: 3200,
      ratePerKg: 35000,
      supplier: "JK Paper",
      moq: 500,
      status: "active" as const,
    },
    {
      id: "rate-4",
      paperType: "Art Card",
      gsm: 300,
      size: "25x36",
      landedCost: 8500,
      chargeRate: 9500,
      ratePerKg: 12500,
      supplier: "ITC",
      moq: 100,
      status: "active" as const,
    },
  ];

  const request = createExampleRequest();

  // Validate request before processing
  const validation = validateEstimationRequest(request);
  if (!validation.valid) {
    console.error("Request validation failed:", validation.errors);
    return;
  }

  try {
    // Run auto-planning with progress tracking
    const result = await autoPlan(request, inventoryItems, rateCardEntries, {
      onProgress: (stage, progress) => {
        console.log(`${stage} (${progress}%)`);
      },
    });

    // Process result
    console.log("Estimation completed:");
    console.log(`Total Cost: ₹${result.totalCost.toFixed(2)}`);
    console.log(`Cost per copy: ₹${result.costPerCopy.toFixed(2)}`);
    console.log("\nDiagnostics:");
    result.diagnostics.forEach((d) => {
      const section = d.section ? ` [${d.section}]` : "";
      console.log(`  ${d.type.toUpperCase()}${section}: ${d.message}`);
    });

    return result;
  } catch (error) {
    console.error("Auto-planning failed:", error);
  }
}

// ============================================================================
// EXAMPLE 2: Quick API Usage
// ============================================================================

/**
 * Minimal example for integration with API endpoint
 */
export async function quickEstimate(jobData: any) {
  try {
    // In production, fetch from stores via API calls
    const request: EstimationRequest = jobData.request;

    // Simulated store data (would be real API calls in production)
    const inventoryData: any[] = [];
    const rateCardData: any[] = [];

    // Validate and estimate
    const validation = validateEstimationRequest(request);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const result = await autoPlan(request, inventoryData, rateCardData);

    return {
      success: true,
      estimation: result,
      costPerCopy: result.costPerCopy,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// EXAMPLE 3: Progressive Enhancement - User Customization After Auto-Plan
// ============================================================================

/**
 * After auto-plan generates initial estimate, user can customize:
 * - Manual paper selection from recommended alternatives
 * - Machine preference override
 * - Custom margins and discounts
 * - Additional finishing options
 */
export async function customizeEstimate(
  autoResult: any,
  customizations: {
    selectedPaperSourceId?: string; // From paperSources.alternatives[]
    preferredMachineId?: string; // From machineRanking.alternatives[]
    margin?: number; // Override default margin
    discount?: number; // Apply customer discount
  }
) {
  // In Part 3, we'll add:
  // 1. Cost calculator that applies margins/discounts
  // 2. Finishing cost calculator (lamination, binding, etc.)
  // 3. Quotation snapshot with refresh capability
  // 4. PDF quotation generation

  console.log("Customization options:", customizations);
  console.log("(Full customization logic in Part 3)");

  return { customized: true };
}
