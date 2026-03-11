// ============================================================================
// ESTIMATION TRACE / DEBUG SYSTEM
// ============================================================================
// Produces a line-by-line diagnostic output that can be compared 
// directly against the Excel estimator for calibration.
//
// Usage:
//   const trace = createTrace();
//   trace.section("Paper - Text 1");
//   trace.log("Sheet size", "23×36 (585×915mm)");
//   trace.value("Net sheets", 500);
//   trace.cost("Paper cost", 14.454, "per copy");
//   ...
//   console.log(trace.toString());
//
// Output format matches Excel cell references for easy comparison.
// ============================================================================

export interface TraceEntry {
    section: string;
    key: string;
    value: string | number;
    unit?: string;
    formula?: string;
    excelRef?: string;
}

export interface TraceSection {
    name: string;
    entries: TraceEntry[];
}

export interface EstimationTrace {
    jobTitle: string;
    timestamp: string;
    sections: TraceSection[];
    summary: {
        paperCost: number;
        productionCost: number;
        packingCost: number;
        freightCost: number;
        totalCost: number;
        sellingPrice: number;
        foreignPrice: number;
        currency: string;
    };
}

// ─── TRACE BUILDER ───────────────────────────────────────────────────────────

export class TraceBuilder {
    private _sections: TraceSection[] = [];
    private _currentSection: TraceSection | null = null;
    private _enabled: boolean;
    private _jobTitle: string;

    constructor(jobTitle: string = '', enabled: boolean = true) {
        this._jobTitle = jobTitle;
        this._enabled = enabled;
    }

    /** Start a new trace section (e.g., "Paper - Text 1") */
    section(name: string): void {
        if (!this._enabled) return;
        this._currentSection = { name, entries: [] };
        this._sections.push(this._currentSection);
    }

    /** Log a key-value pair */
    log(key: string, value: string | number, unit?: string): void {
        if (!this._enabled || !this._currentSection) return;
        this._currentSection.entries.push({
            section: this._currentSection.name,
            key,
            value,
            unit,
        });
    }

    /** Log a numeric value with formatting */
    value(key: string, val: number, unit?: string, formula?: string): void {
        if (!this._enabled || !this._currentSection) return;
        this._currentSection.entries.push({
            section: this._currentSection.name,
            key,
            value: val,
            unit,
            formula,
        });
    }

    /** Log a cost line (formatted as Rs X.XX) */
    cost(key: string, amount: number, per?: string, formula?: string): void {
        if (!this._enabled || !this._currentSection) return;
        const unit = per ? `Rs ${per}` : 'Rs';
        this._currentSection.entries.push({
            section: this._currentSection.name,
            key,
            value: amount,
            unit,
            formula,
        });
    }

    /** Log a comparison line (actual vs expected) */
    compare(key: string, actual: number, expected: number, unit?: string): void {
        if (!this._enabled || !this._currentSection) return;
        const delta = actual - expected;
        const pctDiff = expected !== 0 ? ((delta / expected) * 100) : 0;
        const status = Math.abs(pctDiff) <= 1 ? '✅' : Math.abs(pctDiff) <= 5 ? '⚠️' : '❌';
        this._currentSection.entries.push({
            section: this._currentSection.name,
            key: `${status} ${key}`,
            value: `${actual.toFixed(2)} vs ${expected.toFixed(2)} (${delta >= 0 ? '+' : ''}${pctDiff.toFixed(1)}%)`,
            unit,
        });
    }

    /** Separate subsections visually */
    separator(): void {
        if (!this._enabled || !this._currentSection) return;
        this._currentSection.entries.push({
            section: this._currentSection.name,
            key: '─────────────────────────',
            value: '',
        });
    }

    /** Build the structured trace object */
    build(): EstimationTrace {
        return {
            jobTitle: this._jobTitle,
            timestamp: new Date().toISOString(),
            sections: this._sections,
            summary: {
                paperCost: 0,
                productionCost: 0,
                packingCost: 0,
                freightCost: 0,
                totalCost: 0,
                sellingPrice: 0,
                foreignPrice: 0,
                currency: 'INR',
            },
        };
    }

    /** Format as a human-readable string for console output / comparison */
    toString(): string {
        if (!this._enabled) return '';

        const lines: string[] = [];
        lines.push('╔══════════════════════════════════════════════════════════════╗');
        lines.push(`║  ESTIMATION TRACE: ${this._jobTitle.padEnd(40)} ║`);
        lines.push(`║  ${new Date().toISOString().padEnd(58)} ║`);
        lines.push('╚══════════════════════════════════════════════════════════════╝');
        lines.push('');

        for (const section of this._sections) {
            lines.push(`┌── ${section.name} ${'─'.repeat(Math.max(0, 55 - section.name.length))}┐`);

            for (const entry of section.entries) {
                if (entry.key.startsWith('──')) {
                    lines.push(`│  ${entry.key}  │`);
                    continue;
                }

                const valStr = typeof entry.value === 'number'
                    ? entry.value.toLocaleString('en-IN', { maximumFractionDigits: 3 })
                    : String(entry.value);

                const unitStr = entry.unit ? ` ${entry.unit}` : '';
                const formulaStr = entry.formula ? `  [${entry.formula}]` : '';
                const keyPadded = entry.key.padEnd(28);
                lines.push(`│  ${keyPadded} ${valStr}${unitStr}${formulaStr}`);
            }

            lines.push(`└${'─'.repeat(60)}┘`);
            lines.push('');
        }

        return lines.join('\n');
    }

    /** Log to console with formatting */
    print(): void {
        if (!this._enabled) return;
        console.log(this.toString());
    }

    /** Get raw sections for programmatic access */
    getSections(): TraceSection[] {
        return this._sections;
    }

    get enabled(): boolean {
        return this._enabled;
    }
}

// ─── FACTORY ─────────────────────────────────────────────────────────────────

export function createTrace(jobTitle: string = '', enabled: boolean = true): TraceBuilder {
    return new TraceBuilder(jobTitle, enabled);
}

// ─── CALIBRATION HELPER ──────────────────────────────────────────────────────
// Compare an estimation result against the calibration benchmark

export interface CalibrationCheck {
    field: string;
    actual: number;
    expected: number;
    delta: number;
    deltaPercent: number;
    pass: boolean;      // Within ±1%
    acceptable: boolean; // Within ±5%
}

export function runCalibrationCheck(
    actual: Record<string, number>,
    expected: Record<string, number>,
): CalibrationCheck[] {
    const checks: CalibrationCheck[] = [];

    const fields = Object.keys(expected);
    for (const field of fields) {
        const act = actual[field] ?? 0;
        const exp = expected[field] ?? 0;
        const delta = act - exp;
        const deltaPct = exp !== 0 ? (delta / exp) * 100 : 0;

        checks.push({
            field,
            actual: act,
            expected: exp,
            delta,
            deltaPercent: deltaPct,
            pass: Math.abs(deltaPct) <= 1,
            acceptable: Math.abs(deltaPct) <= 5,
        });
    }

    return checks;
}

// ─── COST BREAKDOWN COMPARE MODE ─────────────────────────────────────────────
// The MIS vendor standard for validating estimators.
// Produces a formatted table matching Excel line-by-line.
//
// Example output:
//   Component           Excel       Engine      Diff
//   ───────────────────────────────────────────────────
//   Paper               21.53       21.47       -0.3%  ✅
//   Printing            2.34        2.36        +0.8%  ✅
//   Binding             21.08       20.99       -0.4%  ✅
//   Packing             4.08        4.08        0%     ✅
//   Freight             7.84        7.82        -0.2%  ✅
//   ───────────────────────────────────────────────────
//   TOTAL               65.25       65.23       -0.03% ✅

export interface CostBreakdownComparison {
    component: string;
    excel: number;
    engine: number;
    diffAbsolute: number;
    diffPercent: number;
    status: '✅' | '⚠️' | '❌';
}

export function compareCostBreakdown(
    engineValues: {
        paperPerCopy?: number;
        ctpPerCopy?: number;
        printingPerCopy?: number;
        laminationPerCopy?: number;
        spotUVPerCopy?: number;
        bindingPerCopy?: number;
        finishingPerCopy?: number;
        packingPerCopy?: number;
        freightPerCopy?: number;
        prePressCost?: number;
        productionPerCopy?: number;
        totalPerCopy?: number;
        foreignPrice?: number;
    },
    excelValues?: {
        paperPerCopy?: number;
        ctpPerCopy?: number;
        printingPerCopy?: number;
        laminationPerCopy?: number;
        spotUVPerCopy?: number;
        bindingPerCopy?: number;
        finishingPerCopy?: number;
        packingPerCopy?: number;
        freightPerCopy?: number;
        prePressCost?: number;
        productionPerCopy?: number;
        totalPerCopy?: number;
        foreignPrice?: number;
    }
): CostBreakdownComparison[] {
    // Use CALIBRATION_BENCHMARK defaults if excelValues not provided
    const excel = excelValues || {
        paperPerCopy: 21.53,
        ctpPerCopy: 4.27,
        printingPerCopy: 2.34,
        laminationPerCopy: 0.78,
        spotUVPerCopy: 1.28,
        bindingPerCopy: 21.08,
        finishingPerCopy: 2.06,
        packingPerCopy: 4.08,
        freightPerCopy: 7.84,
        prePressCost: 0.25,
        productionPerCopy: 31.31,
        totalPerCopy: 65.25,
        foreignPrice: 0.738,
    };

    const comparisons: CostBreakdownComparison[] = [];

    const pairs: [string, number, number][] = [
        ['Paper', engineValues.paperPerCopy ?? 0, excel.paperPerCopy ?? 0],
        ['CTP Plates', engineValues.ctpPerCopy ?? 0, excel.ctpPerCopy ?? 0],
        ['Printing', engineValues.printingPerCopy ?? 0, excel.printingPerCopy ?? 0],
        ['Lamination', engineValues.laminationPerCopy ?? 0, excel.laminationPerCopy ?? 0],
        ['Spot UV', engineValues.spotUVPerCopy ?? 0, excel.spotUVPerCopy ?? 0],
        ['Binding', engineValues.bindingPerCopy ?? 0, excel.bindingPerCopy ?? 0],
        ['Packing', engineValues.packingPerCopy ?? 0, excel.packingPerCopy ?? 0],
        ['Freight', engineValues.freightPerCopy ?? 0, excel.freightPerCopy ?? 0],
        ['Pre-press', engineValues.prePressCost ?? 0, excel.prePressCost ?? 0],
        ['PRODUCTION', engineValues.productionPerCopy ?? 0, excel.productionPerCopy ?? 0],
        ['TOTAL', engineValues.totalPerCopy ?? 0, excel.totalPerCopy ?? 0],
        ['Foreign Price', engineValues.foreignPrice ?? 0, excel.foreignPrice ?? 0],
    ];

    for (const [component, engine, excelVal] of pairs) {
        if (engine === 0 && excelVal === 0) continue; // Skip zero-zero entries

        const diff = engine - excelVal;
        const diffPct = excelVal !== 0 ? (diff / excelVal) * 100 : 0;
        const status = Math.abs(diffPct) <= 1 ? '✅' as const
            : Math.abs(diffPct) <= 5 ? '⚠️' as const
                : '❌' as const;

        comparisons.push({
            component,
            excel: excelVal,
            engine,
            diffAbsolute: Math.round(diff * 100) / 100,
            diffPercent: Math.round(diffPct * 10) / 10,
            status,
        });
    }

    return comparisons;
}

/** Format comparison table as console-friendly string */
export function formatComparisonTable(comparisons: CostBreakdownComparison[]): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('╔════════════════════════════════════════════════════════════════════╗');
    lines.push('║                  COST BREAKDOWN COMPARE MODE                      ║');
    lines.push('╚════════════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`  ${'Component'.padEnd(18)} ${'Excel'.padStart(10)} ${'Engine'.padStart(10)} ${'Diff'.padStart(10)}  Status`);
    lines.push(`  ${'─'.repeat(60)}`);

    for (const c of comparisons) {
        const isSummary = c.component === 'PRODUCTION' || c.component === 'TOTAL';
        if (isSummary) {
            lines.push(`  ${'─'.repeat(60)}`);
        }

        const sign = c.diffPercent >= 0 ? '+' : '';
        const diffStr = `${sign}${c.diffPercent.toFixed(1)}%`;
        const row = `  ${c.component.padEnd(18)} ${c.excel.toFixed(2).padStart(10)} ${c.engine.toFixed(2).padStart(10)} ${diffStr.padStart(10)}  ${c.status}`;
        lines.push(row);
    }

    lines.push(`  ${'─'.repeat(60)}`);

    // Overall verdict
    const totalCheck = comparisons.find(c => c.component === 'TOTAL');
    if (totalCheck) {
        const verdict = totalCheck.status === '✅' ? '✅ CALIBRATION PASSED (within ±1%)'
            : totalCheck.status === '⚠️' ? '⚠️ CALIBRATION ACCEPTABLE (within ±5%)'
                : '❌ CALIBRATION FAILED (>5% deviation)';
        lines.push('');
        lines.push(`  ${verdict}`);
    }

    lines.push('');
    return lines.join('\n');
}

// ─── CALIBRATION BENCHMARK VALUES ────────────────────────────────────────────
// 240×195mm, 32pp, 4/4, 150GSM Matt, 2000 copies, Section Sewn Hardcase

export const CALIBRATION_BENCHMARK = {
    paperPerCopy: 21.53,
    ctpPerCopy: 4.27,
    printingPerCopy: 2.34,
    laminationPerCopy: 0.78,
    spotUVPerCopy: 1.28,
    bindingPerCopy: 21.08,
    finishingPerCopy: 2.06,
    packingPerCopy: 4.08,
    freightPerCopy: 7.84,
    prePressCost: 0.25,
    productionPerCopy: 31.31,
    totalPerCopy: 65.25,
    foreignPrice: 0.738,  // GBP per copy FOB Mumbai
};

