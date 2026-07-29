import type { SliderConfig } from "./data";
import { hasGenerator } from "./generators";
import rawSubcategoryData from "./biomimicry-subcategories.json";

// The JSON is filled in per 分類2, so most fields below only exist on variants
// that have been fully speced. Everything past `example` is optional for that
// reason — but anything that IS present gets validated (see validateSliders).
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

// ---------------------------------------------------------------------------
// Runtime slider validation.
//
// This module used to do `rawSubcategoryData as SubcategoryData` and
// `t.sliders as SliderConfig[]`. Those assertions silently lied: `step` is a
// REQUIRED field of SliderConfig, yet all 144 sliders in the JSON were missing
// it and tsc never complained, because an `as` cast asserts rather than checks.
// At runtime `step: undefined` reached <input type="range">, which falls back
// to step=1 — freezing every slider whose whole range was narrower than 1
// (feedRate 0.02–0.06 could only ever be 0.02) and forcing wrong defaults.
//
// So instead of asserting, validate. isValidSlider checks the required fields
// AND the invariant the cast let through: that `default` is actually landable
// given (min, max, step). A slider whose default is unreachable is a real bug,
// because the browser silently snaps it to a different value than the spec.
// ---------------------------------------------------------------------------

/** Multiples of `step` from `min` must land exactly on `value`. */
function isOnStepGrid(value: number, min: number, step: number): boolean {
  const steps = (value - min) / step;
  // Compare against the nearest integer with a tolerance scaled to the step,
  // since binary floats can't represent decimal steps like 0.001 exactly.
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

export function isValidSlider(s: unknown): s is SliderConfig {
  if (typeof s !== "object" || s === null) return false;
  const o = s as Record<string, unknown>;
  if (typeof o.key !== "string" || o.key === "") return false;
  if (typeof o.label !== "string" || o.label === "") return false;
  for (const f of ["min", "max", "step", "default"] as const) {
    if (typeof o[f] !== "number" || !Number.isFinite(o[f] as number)) return false;
  }
  if (o.unit !== undefined && typeof o.unit !== "string") return false;
  if (o.labelZh !== undefined && typeof o.labelZh !== "string") return false;

  const min = o.min as number;
  const max = o.max as number;
  const step = o.step as number;
  const dflt = o.default as number;
  if (min >= max) return false;
  if (step <= 0) return false;
  if (step > max - min) return false; // would freeze the slider
  if (dflt < min || dflt > max) return false;
  if (!isOnStepGrid(dflt, min, step)) return false; // browser would snap it
  return true;
}

/**
 * Returns the sliders only if EVERY entry validates, otherwise null. All-or-
 * nothing on purpose: a partially-valid slider set would render a control
 * panel that silently disagrees with the spec, which is what this whole
 * validation exists to prevent. Callers treat null as "not explorer-ready",
 * so the variant falls back to its lib/data.ts baseline instead.
 */
export function validateSliders(raw: unknown): SliderConfig[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.every(isValidSlider) ? (raw as SliderConfig[]) : null;
}

const subcategoryData = rawSubcategoryData as unknown as SubcategoryData;

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

/**
 * Resolved sliders for one type, or null if the type has none or any of them
 * fail validation. Use this rather than reading `type.sliders` directly, so a
 * malformed slider can never reach the UI.
 */
export function getValidatedSliders(type: SubcategoryPatternType): SliderConfig[] | null {
  return validateSliders(type.sliders);
}

// The ONLY gate for showing the new 4-card explorer: this variant must have
// a JSON entry with exactly 4 types, and every single one of them must carry
// a `generator` that actually exists in lib/generators.ts's registry, plus
// its own sliders that all pass validation. Falling short on any of the 4
// means the whole variant falls back to its own single baseline generator
// (lib/data.ts) — never a partial explorer, and never a generic stand-in.
export function isVariantExplorerReady(variantSlug: string): boolean {
  const sub = findSubcategory(variantSlug);
  if (!sub || sub.types.length !== 4) return false;
  return sub.types.every(
    (t) =>
      typeof t.generator === "string" &&
      hasGenerator(t.generator) &&
      validateSliders(t.sliders) !== null
  );
}

/**
 * Dev-time audit of every slider in the JSON, used by the build-time check in
 * scripts and by tests. Returns a list of human-readable problems; empty means
 * the whole data file is sound.
 */
export function auditAllSliders(): string[] {
  const problems: string[] = [];
  for (const cat of subcategoryData.categories) {
    for (const sub of cat.subcategories) {
      for (const t of sub.types) {
        if (t.sliders === undefined) continue;
        if (!Array.isArray(t.sliders) || t.sliders.length === 0) {
          problems.push(`${sub.category2_id}/${t.slug ?? t.id}: sliders present but empty/not an array`);
          continue;
        }
        t.sliders.forEach((s, i) => {
          if (!isValidSlider(s)) {
            const key = (s as { key?: string } | null)?.key ?? `#${i}`;
            problems.push(`${sub.category2_id}/${t.slug ?? t.id}: invalid slider "${key}"`);
          }
        });
      }
    }
  }
  return problems;
}
