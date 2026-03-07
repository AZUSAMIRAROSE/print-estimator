// ============================================================================
// MONTE-CARLO ESTIMATE STABILITY TEST
// ============================================================================
// Professional feature to test whether an estimate is robust to slight 
// input variations (e.g., paper price changes, wastage variance, freight).
// 
// Runs 100 iterations with randomized variances to determine a confidence 
// interval and price range.
// ============================================================================

import { calculateFullEstimation } from "./estimator";

export interface MonteCarloResult {
    minPrice: number;
    maxPrice: number;
    meanPrice: number;
    confidence95Min: number;
    confidence95Max: number;
    iterationsRun: number;
    stable: boolean;
}

export async function runMonteCarloSimulation(jobSpec: any, quantity: number, iterations = 100): Promise<MonteCarloResult> {
    const results: number[] = [];

    // Helper for gaussian random
    function randomGaussian(mean: number, stdev: number): number {
        let u = 1 - Math.random();
        let v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdev + mean;
    }

    for (let i = 0; i < iterations; i++) {
        // Deep clone to mutate safely
        const simSpec = JSON.parse(JSON.stringify(jobSpec));

        // Inject variance (±3% paper, ±5% freight)
        simSpec.textSections.forEach((sec: any) => {
            if (sec.paperCostPerKg) {
                // StdDev = 1% means 99.7% of values fall within ±3%
                sec.paperCostPerKg *= randomGaussian(1.0, 0.01);
            }
        });

        if (simSpec.cover?.paperCostPerKg) {
            simSpec.cover.paperCostPerKg *= randomGaussian(1.0, 0.01);
        }

        // We run the full estimation pipeline for the simulation spec
        try {
            // Wait to keep event loop free if necessary, though this is synchronous
            const estResult = calculateFullEstimation(simSpec);

            // Find the result matching our quantity
            const qResult = estResult.find((r: any) => r.quantity === quantity);
            if (qResult) {
                // Apply freight variance directly to the total selling price
                // Freight variance ±5%
                const freightVariance = randomGaussian(1.0, 0.016);
                const finalSellingPrice = qResult.totalSellingPrice * freightVariance;

                results.push(finalSellingPrice);
            }
        } catch (e) {
            // Ignore failed iterations
        }
    }

    if (results.length === 0) {
        throw new Error("Simulation failed to produce any valid estimates.");
    }

    results.sort((a, b) => a - b);

    let sum = results.reduce((a, b) => a + b, 0);
    let mean = sum / results.length;

    // 95% confidence interval roughly drops the bottom 2.5% and top 2.5%
    const p2_5 = Math.floor(results.length * 0.025);
    const p97_5 = Math.floor(results.length * 0.975);

    const confMin = results[p2_5];
    const confMax = results[p97_5];
    const minPrice = results[0];
    const maxPrice = results[results.length - 1];

    // Check stability (e.g. variance < 5%)
    const variation = (confMax - confMin) / mean;
    const stable = variation <= 0.05;

    return {
        minPrice,
        maxPrice,
        meanPrice: mean,
        confidence95Min: confMin,
        confidence95Max: confMax,
        iterationsRun: results.length,
        stable,
    };
}

export function formatMonteCarloReport(result: MonteCarloResult, currency = '₹'): string {
    const minStr = result.confidence95Min.toFixed(2);
    const maxStr = result.confidence95Max.toFixed(2);
    const meanStr = result.meanPrice.toFixed(2);

    const lines = [
        `╔═════════════════════════════════════════════════════════════════╗`,
        `║             MONTE CARLO ESTIMATE STABILITY TEST                 ║`,
        `╚═════════════════════════════════════════════════════════════════╝`,
        `  Iterations: ${result.iterationsRun}`,
        `  Variance Model: Paper Cost (±3%), Freight (±5%)`,
        `  ─────────────────────────────────────────────────────────────`,
        `  Price Range (95% Conf):  ${currency}${minStr} – ${currency}${maxStr}`,
        `  Mean Estimated Price:    ${currency}${meanStr}`,
        `  Absolute Min/Max:        ${currency}${result.minPrice.toFixed(2)} – ${currency}${result.maxPrice.toFixed(2)}`,
        `  ─────────────────────────────────────────────────────────────`,
        `  Verdict: ${result.stable ? '✅ STABLE (Variance < 5%)' : '⚠️ HIGH VARIANCE (Review Supply Chain Risks)'}`,
        ``
    ];
    return lines.join('\n');
}
