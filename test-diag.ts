import { calculateFullEstimation } from "./src/utils/calculations/estimator.js";
import { normalizeEstimationForCalculation } from "./src/utils/validation/estimation.js";

// Mock minimal state
const mockEstimation = {
    id: "test",
    jobTitle: "Test",
    quantities: [1000],
    bookSpec: { widthMM: 210, heightMM: 297 },
    textSections: [{ id: "1", enabled: true, pages: 16, gsm: 130, paperTypeName: "Art Matte", colorsFront: 4, colorsBack: 4, machineId: "sm102", machineName: "Speedmaster", sectionType: "text1" }],
    cover: { enabled: true, gsm: 300, paperTypeName: "Art Card", colorsFront: 4, colorsBack: 4, machineId: "sm102", machineName: "Speedmaster" },
    jacket: { enabled: false },
    endleaves: { enabled: false },
    binding: { primaryBinding: "perfect_binding", purBinding: false, ribbonMarker: 0 },
    finishing: {
        coverLamination: { enabled: true, type: "thermal_matte", side: "one_side" },
        textVarnish: { enabled: false },
        coverVarnish: { enabled: false },
        spotUV: { enabled: false },
        foiling: { enabled: false },
        embossing: { enabled: false },
        dieCutting: { enabled: false }
    },
    delivery: { destinationId: "local", isOverseas: false },
    pricing: { currency: "INR", marginPercent: 20, taxPercent: 18 }
};

try {
    console.log("Normalizing...");
    const normalized = normalizeEstimationForCalculation(mockEstimation as any);
    console.log("Calculating...");
    const results = calculateFullEstimation(normalized);
    console.log("Success! Results:", results.length);
} catch (e) {
    console.error("Calculation crashed:", e.message);
    console.error(e.stack);
}
