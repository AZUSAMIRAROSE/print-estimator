import { test } from "vitest";
import assert from "node:assert/strict";
import {
    generateCategoryCode,
    generateItemCode,
    autoGenerateLegacyCodes,
    isValidCategoryCode,
    isValidItemCode,
    parseCode,
    initializeCodeCounters,
} from "../src/utils/globalCodes";

// ─── Category Code Generation ────────────────────────────────────────────────

test("generateCategoryCode produces valid CAT- codes", () => {
    const code = generateCategoryCode("paper");
    assert.ok(code.startsWith("CAT-PAPER-"), `Expected CAT-PAPER-*, got ${code}`);
    assert.ok(isValidCategoryCode(code), `Code ${code} should be valid`);
});

test("generateCategoryCode increments sequence", () => {
    const code1 = generateCategoryCode("ink");
    const code2 = generateCategoryCode("ink");
    assert.notEqual(code1, code2, "Sequential codes should be unique");
    assert.ok(code1.startsWith("CAT-INK-"));
    assert.ok(code2.startsWith("CAT-INK-"));
});

test("generateCategoryCode handles unknown domains", () => {
    const code = generateCategoryCode("custom_domain");
    assert.ok(code.startsWith("CAT-"), `Expected CAT- prefix, got ${code}`);
});

// ─── Item Code Generation ────────────────────────────────────────────────────

test("generateItemCode produces valid ITM- codes", () => {
    const code = generateItemCode("paper");
    assert.ok(code.startsWith("ITM-PAPER-"), `Expected ITM-PAPER-*, got ${code}`);
    assert.ok(isValidItemCode(code), `Code ${code} should be valid`);
});

test("generateItemCode from category code extracts domain", () => {
    const catCode = generateCategoryCode("board");
    const itemCode = generateItemCode(catCode);
    assert.ok(itemCode.startsWith("ITM-BOARD-"), `Expected ITM-BOARD-*, got ${itemCode}`);
});

test("generateItemCode increments sequence", () => {
    const code1 = generateItemCode("foil");
    const code2 = generateItemCode("foil");
    assert.notEqual(code1, code2, "Sequential item codes should be unique");
});

// ─── Code Validation ─────────────────────────────────────────────────────────

test("isValidCategoryCode validates format", () => {
    assert.ok(isValidCategoryCode("CAT-PAPER-0001"));
    assert.ok(isValidCategoryCode("CAT-INK-9999"));
    assert.ok(!isValidCategoryCode("ITM-PAPER-000001"));
    assert.ok(!isValidCategoryCode("CAT-PA-0001")); // too short domain
    assert.ok(!isValidCategoryCode("cat-PAPER-0001")); // lowercase
    assert.ok(!isValidCategoryCode("CAT-PAPER-01")); // too short seq
});

test("isValidItemCode validates format", () => {
    assert.ok(isValidItemCode("ITM-PAPER-000001"));
    assert.ok(isValidItemCode("ITM-INK-999999"));
    assert.ok(!isValidItemCode("CAT-PAPER-0001"));
    assert.ok(!isValidItemCode("ITM-PAPER-001")); // too short seq
});

// ─── Code Parsing ────────────────────────────────────────────────────────────

test("parseCode extracts parts from category code", () => {
    const parsed = parseCode("CAT-PAPER-0042");
    assert.ok(parsed);
    assert.equal(parsed.type, "category");
    assert.equal(parsed.domain, "PAPER");
    assert.equal(parsed.sequence, "0042");
});

test("parseCode extracts parts from item code", () => {
    const parsed = parseCode("ITM-INK-000123");
    assert.ok(parsed);
    assert.equal(parsed.type, "item");
    assert.equal(parsed.domain, "INK");
    assert.equal(parsed.sequence, "000123");
});

test("parseCode returns null for invalid code", () => {
    assert.equal(parseCode("INVALID"), null);
    assert.equal(parseCode(""), null);
});

// ─── Legacy Auto-Generation ──────────────────────────────────────────────────

test("autoGenerateLegacyCodes generates codes for items missing them", () => {
    const items = [
        { id: "1", category: "paper" },
        { id: "2", category: "ink", categoryCode: "CAT-INK-0001", itemCode: "ITM-INK-000001" },
        { id: "3", category: "board" },
    ];

    const updates: Array<{ id: string; categoryCode: string; itemCode: string }> = [];
    const result = autoGenerateLegacyCodes(items, (id, catCode, itmCode) => {
        updates.push({ id, categoryCode: catCode, itemCode: itmCode });
    });

    assert.equal(result.generated, 2, "Should generate for 2 items");
    assert.equal(result.skipped, 1, "Should skip 1 item with existing codes");
    assert.equal(updates.length, 2);
    assert.ok(updates[0].categoryCode.startsWith("CAT-"));
    assert.ok(updates[0].itemCode.startsWith("ITM-"));
});
