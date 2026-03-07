export type CodeDomain = "INV" | "RATE";

const CATEGORY_CODE_PATTERN = /^CAT-([A-Z]+)-(\d{4})(?:-D\d{2})?$/;
const ITEM_CODE_PATTERN = /^ITM-([A-Z0-9]+)-(\d{6})(?:-D\d{2})?$/;

function normalizeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function extractMaxSequence(codes: string[], regex: RegExp): number {
  return codes.reduce((max, code) => {
    const match = regex.exec(code);
    if (!match) return max;
    const sequence = Number(match[2]);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
}

export function reserveNextCategoryCode(domain: CodeDomain, existingCodes: string[]): string {
  const prefix = `CAT-${domain}-`;
  const scoped = existingCodes.filter((code) => code.startsWith(prefix));
  const next = extractMaxSequence(scoped, CATEGORY_CODE_PATTERN) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function reserveNextItemCode(categoryCode: string, existingCodes: string[]): string {
  const categorySegment = normalizeSegment(categoryCode);
  const prefix = `ITM-${categorySegment}-`;
  const scoped = existingCodes.filter((code) => code.startsWith(prefix));
  const next = extractMaxSequence(scoped, ITEM_CODE_PATTERN) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

export function withDeterministicCollisionSuffix(baseCode: string, existingCodes: Set<string>): string {
  if (!existingCodes.has(baseCode)) return baseCode;
  let index = 1;
  while (existingCodes.has(`${baseCode}-D${String(index).padStart(2, "0")}`)) {
    index += 1;
  }
  return `${baseCode}-D${String(index).padStart(2, "0")}`;
}

export function backfillUniqueCodes<T extends { categoryCode?: string; itemCode?: string }>(
  records: T[],
  domain: CodeDomain,
): T[] {
  const seenCategoryCodes = new Set<string>();
  const seenItemCodes = new Set<string>();
  const existingCategoryCodes = records.map((r) => r.categoryCode || "").filter(Boolean);

  return records.map((record) => {
    let categoryCode = record.categoryCode || reserveNextCategoryCode(domain, [...existingCategoryCodes, ...Array.from(seenCategoryCodes)]);
    categoryCode = withDeterministicCollisionSuffix(categoryCode, seenCategoryCodes);
    seenCategoryCodes.add(categoryCode);

    let itemCode = record.itemCode || reserveNextItemCode(categoryCode, Array.from(seenItemCodes));
    itemCode = withDeterministicCollisionSuffix(itemCode, seenItemCodes);
    seenItemCodes.add(itemCode);

    return {
      ...record,
      categoryCode,
      itemCode,
    };
  });
}

