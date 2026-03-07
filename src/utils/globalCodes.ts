// ============================================================================
// GLOBAL CODE SYSTEM — INVENTORY & CATEGORY IDENTIFIERS
// ============================================================================
// Every inventory item and rate card item gets a globally unique identifier.
//
// Category code: CAT-<DOMAIN>-NNNN
//   e.g., CAT-PAPER-0001, CAT-INK-0002, CAT-FINISH-0003
//
// Item code: ITM-<CATEGORYCODE>-NNNNNN
//   e.g., ITM-PAPER-000001, ITM-INK-000042
//
// Legacy records missing codes: auto-generated.
// Collision resolution: deterministic suffix (hash-based).
// ============================================================================

// ─── DOMAIN CODES ────────────────────────────────────────────────────────────

const DOMAIN_MAP: Record<string, string> = {
    paper: "PAPER",
    plates: "PLATE",
    finishing: "FINSH",
    packing: "PACKN",
    ink: "INK",
    chemicals: "CHEM",
    consumables: "CNSM",
    spare_parts: "SPARE",
    other: "OTHER",
    board: "BOARD",
    cloth: "CLOTH",
    foil: "FOIL",
    adhesive: "ADHSV",
    thread: "THRED",
};

// ─── STATE: IN-MEMORY COUNTERS ───────────────────────────────────────────────
// In production these would be persisted to DB. For now, track in-memory
// and scan existing items to determine next available sequence.

const categoryCounters: Map<string, number> = new Map();
const itemCounters: Map<string, number> = new Map();
const usedCategoryCodes: Set<string> = new Set();
const usedItemCodes: Set<string> = new Set();

// ─── DETERMINISTIC HASH ──────────────────────────────────────────────────────
// Simple hash for collision resolution suffix (deterministic, not crypto)

function djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
}

function collisionSuffix(baseCode: string, attempt: number): string {
    const hash = djb2Hash(`${baseCode}:${attempt}`);
    return (hash % 10000).toString().padStart(4, "0");
}

// ─── GENERATORS ──────────────────────────────────────────────────────────────

/**
 * Generate a category code: CAT-<DOMAIN>-NNNN
 */
export function generateCategoryCode(domain: string): string {
    const domainCode = DOMAIN_MAP[domain.toLowerCase()] || domain.toUpperCase().slice(0, 5);

    const currentCount = categoryCounters.get(domainCode) || 0;
    const nextCount = currentCount + 1;
    categoryCounters.set(domainCode, nextCount);

    let code = `CAT-${domainCode}-${nextCount.toString().padStart(4, "0")}`;

    // Collision resolution
    let attempt = 0;
    while (usedCategoryCodes.has(code)) {
        attempt++;
        const suffix = collisionSuffix(code, attempt);
        code = `CAT-${domainCode}-${suffix}`;
    }

    usedCategoryCodes.add(code);
    return code;
}

/**
 * Generate an item code: ITM-<DOMAIN>-NNNNNN
 */
export function generateItemCode(categoryCodeOrDomain: string): string {
    // Extract domain from category code if provided as CAT-XXXXX-NNNN
    let domainCode: string;
    if (categoryCodeOrDomain.startsWith("CAT-")) {
        const parts = categoryCodeOrDomain.split("-");
        domainCode = parts[1] || "OTHER";
    } else {
        domainCode = DOMAIN_MAP[categoryCodeOrDomain.toLowerCase()] || categoryCodeOrDomain.toUpperCase().slice(0, 5);
    }

    const currentCount = itemCounters.get(domainCode) || 0;
    const nextCount = currentCount + 1;
    itemCounters.set(domainCode, nextCount);

    let code = `ITM-${domainCode}-${nextCount.toString().padStart(6, "0")}`;

    // Collision resolution
    let attempt = 0;
    while (usedItemCodes.has(code)) {
        attempt++;
        const suffix = collisionSuffix(code, attempt);
        code = `ITM-${domainCode}-${suffix.padStart(6, "0")}`;
    }

    usedItemCodes.add(code);
    return code;
}

/**
 * Auto-generate codes for legacy records that are missing them.
 * Returns the number of codes generated.
 */
export function autoGenerateLegacyCodes(
    items: Array<{ id: string; categoryCode?: string; itemCode?: string; category?: string }>,
    updateCallback?: (id: string, categoryCode: string, itemCode: string) => void
): { generated: number; skipped: number } {
    let generated = 0;
    let skipped = 0;

    for (const item of items) {
        const hasCategoryCode = item.categoryCode && item.categoryCode.startsWith("CAT-");
        const hasItemCode = item.itemCode && item.itemCode.startsWith("ITM-");

        if (hasCategoryCode && hasItemCode) {
            // Track existing codes to prevent collisions
            usedCategoryCodes.add(item.categoryCode!);
            usedItemCodes.add(item.itemCode!);
            skipped++;
            continue;
        }

        const domain = item.category || "other";
        const categoryCode = hasCategoryCode ? item.categoryCode! : generateCategoryCode(domain);
        const itemCode = hasItemCode ? item.itemCode! : generateItemCode(categoryCode);

        if (updateCallback) {
            updateCallback(item.id, categoryCode, itemCode);
        }

        generated++;
    }

    return { generated, skipped };
}

/**
 * Validate a code format.
 */
export function isValidCategoryCode(code: string): boolean {
    return /^CAT-[A-Z]{3,5}-\d{4}$/.test(code);
}

export function isValidItemCode(code: string): boolean {
    return /^ITM-[A-Z]{3,5}-\d{6}$/.test(code);
}

/**
 * Parse a code to extract its parts.
 */
export function parseCode(code: string): { type: "category" | "item"; domain: string; sequence: string } | null {
    const catMatch = code.match(/^CAT-([A-Z]{3,5})-(\d{4})$/);
    if (catMatch) {
        return { type: "category", domain: catMatch[1], sequence: catMatch[2] };
    }

    const itmMatch = code.match(/^ITM-([A-Z]{3,5})-(\d{6})$/);
    if (itmMatch) {
        return { type: "item", domain: itmMatch[1], sequence: itmMatch[2] };
    }

    return null;
}

/**
 * Initialize counters from existing items (call once at startup).
 */
export function initializeCodeCounters(
    items: Array<{ categoryCode?: string; itemCode?: string }>
): void {
    for (const item of items) {
        if (item.categoryCode) {
            usedCategoryCodes.add(item.categoryCode);
            const parsed = parseCode(item.categoryCode);
            if (parsed) {
                const seq = parseInt(parsed.sequence, 10);
                const current = categoryCounters.get(parsed.domain) || 0;
                if (seq > current) categoryCounters.set(parsed.domain, seq);
            }
        }
        if (item.itemCode) {
            usedItemCodes.add(item.itemCode);
            const parsed = parseCode(item.itemCode);
            if (parsed) {
                const seq = parseInt(parsed.sequence, 10);
                const current = itemCounters.get(parsed.domain) || 0;
                if (seq > current) itemCounters.set(parsed.domain, seq);
            }
        }
    }
}
