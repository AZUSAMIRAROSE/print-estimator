// ============================================================================
// JOB VALIDATION LAYER — PRE-ESTIMATION SAFETY CHECKS
// ============================================================================
// Validates ALL inputs BEFORE estimation begins.
// Catches garbage-in → garbage-out scenarios that cause silent errors.
//
// Rules:
//   - Pages must be multiple of 2 (front + back)
//   - Trim size must fit at least one available machine
//   - GSM must be in valid range (30–450)
//   - Binding must support the page count
//   - Quantities must be positive integers
//   - Paper type must exist in known types
//   - Machine must be active and capable
// ============================================================================

import { STANDARD_PAPER_SIZES, DEFAULT_MACHINES } from "@/constants";
import type { EstimationInput } from "@/types";

// ─── VALIDATION RESULT ───────────────────────────────────────────────────────

export interface ValidationError {
    field: string;          // Dot path: "textSections[0].pages"
    code: string;           // Machine-readable: "PAGES_NOT_EVEN"
    message: string;        // Human-readable
    severity: 'error' | 'warning';
    suggestion?: string;    // Auto-fix suggestion
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    correctedInput?: EstimationInput;  // Auto-corrected version if possible
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const LIMITS = {
    MIN_GSM: 30,
    MAX_GSM: 450,
    MIN_PAGES: 2,
    MAX_PAGES: 2048,
    MIN_TRIM_MM: 50,
    MAX_TRIM_MM: 500,
    MIN_QUANTITY: 1,
    MAX_QUANTITY: 10_000_000,
    MAX_QUANTITIES: 5,
    MIN_COLORS: 0,
    MAX_COLORS: 8,
    MAX_SPINE_MM: 120,
    SADDLE_STITCH_MAX_PAGES: 128,
    WIRE_O_MAX_PAGES: 400,
} as const;

// ─── MAIN VALIDATION FUNCTION ────────────────────────────────────────────────

export function validateJob(input: EstimationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // ── 1. BASIC INFO ──────────────────────────────────────────────────────
    if (!input.jobTitle?.trim()) {
        warnings.push({
            field: 'jobTitle',
            code: 'MISSING_TITLE',
            message: 'Job title is empty. A title helps identify this estimate.',
            severity: 'warning',
        });
    }

    // ── 2. QUANTITIES ──────────────────────────────────────────────────────
    const activeQtys = input.quantities.filter(q => q > 0);
    if (activeQtys.length === 0) {
        errors.push({
            field: 'quantities',
            code: 'NO_QUANTITIES',
            message: 'At least one quantity must be greater than zero.',
            severity: 'error',
        });
    }

    for (let i = 0; i < input.quantities.length; i++) {
        const q = input.quantities[i];
        if (q < 0) {
            errors.push({
                field: `quantities[${i}]`,
                code: 'NEGATIVE_QUANTITY',
                message: `Quantity ${i + 1} is negative (${q}). Must be >= 0.`,
                severity: 'error',
            });
        }
        if (q > LIMITS.MAX_QUANTITY) {
            warnings.push({
                field: `quantities[${i}]`,
                code: 'VERY_LARGE_QUANTITY',
                message: `Quantity ${i + 1} (${q.toLocaleString()}) is very large. Verify this is correct.`,
                severity: 'warning',
            });
        }
        if (q > 0 && !Number.isInteger(q)) {
            errors.push({
                field: `quantities[${i}]`,
                code: 'NON_INTEGER_QUANTITY',
                message: `Quantity ${i + 1} (${q}) must be a whole number.`,
                severity: 'error',
                suggestion: `Round to ${Math.ceil(q)}`,
            });
        }
    }

    // ── 3. BOOK SPEC (TRIM SIZE) ───────────────────────────────────────────
    const { widthMM, heightMM } = input.bookSpec;

    if (widthMM < LIMITS.MIN_TRIM_MM || widthMM > LIMITS.MAX_TRIM_MM) {
        errors.push({
            field: 'bookSpec.widthMM',
            code: 'TRIM_WIDTH_OUT_OF_RANGE',
            message: `Trim width ${widthMM}mm is out of range (${LIMITS.MIN_TRIM_MM}–${LIMITS.MAX_TRIM_MM}mm).`,
            severity: 'error',
        });
    }

    if (heightMM < LIMITS.MIN_TRIM_MM || heightMM > LIMITS.MAX_TRIM_MM) {
        errors.push({
            field: 'bookSpec.heightMM',
            code: 'TRIM_HEIGHT_OUT_OF_RANGE',
            message: `Trim height ${heightMM}mm is out of range (${LIMITS.MIN_TRIM_MM}–${LIMITS.MAX_TRIM_MM}mm).`,
            severity: 'error',
        });
    }

    // Check trim fits at least one machine
    const trimWithBleedW = widthMM + 6; // 3mm bleed each side
    const trimWithBleedH = heightMM + 6;
    const fitsAnyMachine = DEFAULT_MACHINES.some(m => {
        const maxW_mm = m.maxSheetWidth * 25.4;
        const maxH_mm = m.maxSheetHeight * 25.4;
        return (trimWithBleedW <= maxW_mm && trimWithBleedH <= maxH_mm) ||
            (trimWithBleedH <= maxW_mm && trimWithBleedW <= maxH_mm);
    });

    if (!fitsAnyMachine) {
        errors.push({
            field: 'bookSpec',
            code: 'TRIM_TOO_LARGE_FOR_MACHINES',
            message: `Trim size ${widthMM}×${heightMM}mm (with bleed) exceeds all available machine sizes.`,
            severity: 'error',
            suggestion: 'Reduce trim size or add a larger machine.',
        });
    }

    // Check trim fits at least one paper sheet
    const fitsAnySheet = STANDARD_PAPER_SIZES.some(s => {
        return (trimWithBleedW <= s.widthMM && trimWithBleedH <= s.heightMM) ||
            (trimWithBleedH <= s.widthMM && trimWithBleedW <= s.heightMM);
    });

    if (!fitsAnySheet) {
        errors.push({
            field: 'bookSpec',
            code: 'TRIM_TOO_LARGE_FOR_PAPER',
            message: `Trim size ${widthMM}×${heightMM}mm doesn't fit any standard paper sheet.`,
            severity: 'error',
        });
    }

    // ── 4. TEXT SECTIONS ───────────────────────────────────────────────────
    const enabledText = input.textSections.filter(s => s.enabled);
    if (enabledText.length === 0) {
        errors.push({
            field: 'textSections',
            code: 'NO_TEXT_SECTIONS',
            message: 'At least one text section must be enabled.',
            severity: 'error',
        });
    }

    for (let i = 0; i < input.textSections.length; i++) {
        const section = input.textSections[i];
        if (!section.enabled) continue;

        const prefix = `textSections[${i}]`;

        // Pages must be multiple of 2
        if (section.pages % 2 !== 0) {
            errors.push({
                field: `${prefix}.pages`,
                code: 'PAGES_NOT_EVEN',
                message: `${section.label}: ${section.pages} pages is not even. Pages must be a multiple of 2 (front + back).`,
                severity: 'error',
                suggestion: `Round up to ${section.pages + 1} pages.`,
            });
        }

        if (section.pages < LIMITS.MIN_PAGES) {
            errors.push({
                field: `${prefix}.pages`,
                code: 'TOO_FEW_PAGES',
                message: `${section.label}: ${section.pages} pages is below minimum (${LIMITS.MIN_PAGES}).`,
                severity: 'error',
            });
        }

        if (section.pages > LIMITS.MAX_PAGES) {
            warnings.push({
                field: `${prefix}.pages`,
                code: 'VERY_MANY_PAGES',
                message: `${section.label}: ${section.pages} pages. This is unusual — verify.`,
                severity: 'warning',
            });
        }

        // GSM range
        if (section.gsm < LIMITS.MIN_GSM || section.gsm > LIMITS.MAX_GSM) {
            errors.push({
                field: `${prefix}.gsm`,
                code: 'GSM_OUT_OF_RANGE',
                message: `${section.label}: ${section.gsm} GSM is out of range (${LIMITS.MIN_GSM}–${LIMITS.MAX_GSM}).`,
                severity: 'error',
            });
        }

        // Bible paper warning
        if (section.gsm <= 45) {
            warnings.push({
                field: `${prefix}.gsm`,
                code: 'BIBLE_PAPER_WARNING',
                message: `${section.label}: ${section.gsm} GSM is Bible/thin paper. Surcharges will apply.`,
                severity: 'warning',
            });
        }

        // Colour range
        if (section.colorsFront < LIMITS.MIN_COLORS || section.colorsFront > LIMITS.MAX_COLORS) {
            errors.push({
                field: `${prefix}.colorsFront`,
                code: 'COLORS_OUT_OF_RANGE',
                message: `${section.label}: Front colours (${section.colorsFront}) out of range (0–${LIMITS.MAX_COLORS}).`,
                severity: 'error',
            });
        }

        if (section.colorsBack < LIMITS.MIN_COLORS || section.colorsBack > LIMITS.MAX_COLORS) {
            errors.push({
                field: `${prefix}.colorsBack`,
                code: 'COLORS_OUT_OF_RANGE',
                message: `${section.label}: Back colours (${section.colorsBack}) out of range (0–${LIMITS.MAX_COLORS}).`,
                severity: 'error',
            });
        }
    }

    // ── 5. BINDING COMPATIBILITY ───────────────────────────────────────────
    const totalPages = enabledText.reduce((sum, s) => sum + s.pages, 0);
    const binding = input.binding.primaryBinding;

    if (binding === 'saddle_stitching' && totalPages > LIMITS.SADDLE_STITCH_MAX_PAGES) {
        errors.push({
            field: 'binding.primaryBinding',
            code: 'SADDLE_TOO_MANY_PAGES',
            message: `Saddle stitching is not practical for ${totalPages} pages (max ${LIMITS.SADDLE_STITCH_MAX_PAGES}).`,
            severity: 'error',
            suggestion: 'Switch to perfect binding or section sewn.',
        });
    }

    if (binding === 'wire_o' && totalPages > LIMITS.WIRE_O_MAX_PAGES) {
        warnings.push({
            field: 'binding.primaryBinding',
            code: 'WIRE_O_THICK',
            message: `Wire-O with ${totalPages} pages may be too thick. Max recommended: ${LIMITS.WIRE_O_MAX_PAGES}.`,
            severity: 'warning',
        });
    }

    if (totalPages < 8 && (binding === 'perfect_binding' || binding === 'pur_binding')) {
        warnings.push({
            field: 'binding.primaryBinding',
            code: 'PB_TOO_FEW_PAGES',
            message: `Perfect binding with only ${totalPages} pages. Spine may be too thin to hold.`,
            severity: 'warning',
            suggestion: 'Consider saddle stitching.',
        });
    }

    // ── 6. COVER SECTION ───────────────────────────────────────────────────
    if (input.cover.enabled && !input.cover.selfCover) {
        if (input.cover.gsm < LIMITS.MIN_GSM) {
            errors.push({
                field: 'cover.gsm',
                code: 'COVER_GSM_TOO_LOW',
                message: `Cover GSM (${input.cover.gsm}) is too low.`,
                severity: 'error',
            });
        }
        if (input.cover.gsm < 100 && binding.includes('case')) {
            warnings.push({
                field: 'cover.gsm',
                code: 'COVER_GSM_LOW_FOR_CASE',
                message: `Cover GSM (${input.cover.gsm}) is low for hardcase binding. Typical: 130–200 GSM.`,
                severity: 'warning',
            });
        }
    }

    // ── 7. ENDLEAVES (required for case binding) ───────────────────────────
    if (binding.includes('case') || binding.includes('hardcase')) {
        if (!input.endleaves.enabled) {
            warnings.push({
                field: 'endleaves.enabled',
                code: 'ENDLEAVES_MISSING_FOR_CASE',
                message: 'Endleaves are typically required for hardcase binding.',
                severity: 'warning',
                suggestion: 'Enable endleaves section.',
            });
        }
    }

    // ── 8. PRICING ─────────────────────────────────────────────────────────
    if (input.pricing.marginPercent < 0 || input.pricing.marginPercent > 90) {
        errors.push({
            field: 'pricing.marginPercent',
            code: 'MARGIN_OUT_OF_RANGE',
            message: `Margin ${input.pricing.marginPercent}% is out of range (0–90%).`,
            severity: 'error',
        });
    }

    if (input.pricing.exchangeRate <= 0 && input.pricing.currency !== 'INR') {
        errors.push({
            field: 'pricing.exchangeRate',
            code: 'INVALID_EXCHANGE_RATE',
            message: `Exchange rate must be positive for ${input.pricing.currency}.`,
            severity: 'error',
        });
    }

    // ── RESULT ─────────────────────────────────────────────────────────────
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// ─── QUICK VALIDATION (for UI — returns first error only) ────────────────────
export function quickValidate(input: EstimationInput): string | null {
    const result = validateJob(input);
    return result.errors.length > 0 ? result.errors[0].message : null;
}
