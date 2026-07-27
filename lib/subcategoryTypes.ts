import type { SliderConfig } from "./data";
import { hasGenerator } from "./generators";
import rawSubcategoryData from "./biomimicry-subcategories.json";

// The JSON is being filled in incrementally (Part 2, one 分類2 at a time),
// so most fields below only exist on the variants that have been fully
// speced. Everything past `example` is optional for that reason.
export type SubcategoryPatternType = {
  id: number;
  name: string;
  description: string;
  example: string;
  slug?: string;
  generator?: string;
  climateInput?: string;
  sliders?: SliderConfig[];
  visualPrimitive?: string;
  mappingRule?: string;
  colorSource?: string;
  refNote?: string;
};

type SubcategoryEntry = {
  category2_id: string;
  category2_name: string;
  category2_name_zh: string;
  types: SubcategoryPatternType[];
};

type CategoryEntry = {
  category1_id: string;
  category1_name: string;
  category1_name_zh: string;
  subcategories: SubcategoryEntry[];
};

type SubcategoryData = { categories: CategoryEntry[] };

// Cast rather than rely on TypeScript's inferred JSON-literal type: with
// some type objects carrying the full Part 2 field set and others not yet,
// structural inference on the raw literal would produce an unhelpful union.
const subcategoryData = rawSubcategoryData as SubcategoryData;

function findSubcategory(variantSlug: string): SubcategoryEntry | null {
  for (const cat of subcategoryData.categories) {
    const match = cat.subcategories.find((s) => s.category2_id === variantSlug);
    if (match) return match;
  }
  return null;
}

export function getSubcategoryTypes(variantSlug: string): SubcategoryPatternType[] | null {
  const sub = findSubcategory(variantSlug);
  return sub ? sub.types : null;
}

// The ONLY gate for showing the new 4-card explorer: this variant must have
// a JSON entry with exactly 4 types, and every single one of them must carry
// a `generator` that actually exists in lib/generators.ts's registry, plus
// its own non-empty `sliders`. Falling short on any of the 4 means the whole
// variant falls back to its own single baseline generator (lib/data.ts) —
// never a partial explorer, and never a generic/universal stand-in.
export function isVariantExplorerReady(variantSlug: string): boolean {
  const sub = findSubcategory(variantSlug);
  if (!sub || sub.types.length !== 4) return false;
  return sub.types.every(
    (t) =>
      typeof t.generator === "string" &&
      hasGenerator(t.generator) &&
      Array.isArray(t.sliders) &&
      t.sliders.length > 0
  );
}
