import type { SliderConfig } from "./data";
import { SCALE_PARAM_KEY, SCALE_TIERS, isScaleTier } from "./scale";

/**
 * Reading and writing the playground's state as URL parameters.
 *
 * Until now nothing a student did was addressable: the active type and every
 * slider lived only in React state, so the deepest shareable link opened type #1
 * at defaults. A configuration worth talking about could not be put in a report,
 * sent to a teacher, set as an assignment, or survive a refresh.
 *
 * Pure functions, no DOM: the Next build puts this in the query string and the
 * standalone build puts it after its hash route, and both must agree on the
 * format or a link would mean different things in the two builds.
 *
 * ── Why every value is written, including ones still at their default ──
 * Omitting defaults would make links shorter, but a link's meaning would then
 * depend on what the defaults happen to be when it is OPENED. This project retunes
 * defaults (the whole B0 pass rewrote 13 of them), so a link pasted into a report
 * would silently start showing something else. An explicit link keeps saying what
 * it said. With 3-4 sliders per type the cost is a few characters.
 */

/** A type as this module needs to see it — the shape both builds can supply. */
export type UrlStateType = {
  slug: string;
  sliders: SliderConfig[];
  scaleTier?: string | null;
};

export type DecodedState = {
  typeSlug: string;
  params: Record<string, number>;
  /**
   * What was wrong with the incoming URL, if anything. A hand-edited or truncated
   * link should still open something sensible, but silently drawing from a bad
   * value would present it as a simulation result — so the caller can surface
   * this instead.
   */
  notes: string[];
};

/** Snap to the slider's own step grid, then clamp into range. */
function coerce(value: number, min: number, max: number, step: number): number {
  const snapped = step > 0 ? min + Math.round((value - min) / step) * step : value;
  const clamped = Math.min(max, Math.max(min, snapped));
  // Re-derive from the step count rather than accumulating float error, so a
  // decoded value lands exactly where the slider can sit.
  const steps = step > 0 ? Math.round((clamped - min) / step) : 0;
  const exact = step > 0 ? min + steps * step : clamped;
  return Number(exact.toFixed(6));
}

function extentSpecFor(type: UrlStateType) {
  const tier = type.scaleTier;
  return tier && isScaleTier(tier) ? SCALE_TIERS[tier] : null;
}

/**
 * The full state of one playground as URL parameters, in a stable order so the
 * same configuration always produces the same string (worth having: two students
 * with the same setup get comparable links, and it makes the round-trip testable).
 */
export function encodeState(
  type: UrlStateType,
  params: Record<string, number>
): string {
  const out = new URLSearchParams();
  out.set("t", type.slug);

  const extent = extentSpecFor(type);
  if (extent) {
    const raw = params[SCALE_PARAM_KEY] ?? extent.defaultM;
    out.set(SCALE_PARAM_KEY, String(coerce(raw, extent.min, extent.max, extent.step)));
  }

  for (const s of type.sliders) {
    const raw = params[s.key] ?? s.default;
    out.set(s.key, String(coerce(raw, s.min, s.max, s.step)));
  }

  return out.toString();
}

/**
 * Rebuild a state from URL parameters, falling back rather than failing.
 *
 * Everything here is untrusted input — a link can be hand-edited, truncated by a
 * chat client, or written against an older version of a type. Every value is
 * validated against the slider that owns it, because the alternative is feeding
 * NaN or an out-of-range number into a generator and presenting whatever it draws
 * as a result.
 */
export function decodeState(search: string, types: UrlStateType[]): DecodedState {
  const notes: string[] = [];
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const wanted = q.get("t");
  let type = wanted ? types.find((x) => x.slug === wanted) : undefined;
  if (wanted && !type) {
    notes.push(`未知的類型「${wanted}」,已改用第一個類型`);
  }
  type = type ?? types[0];

  const params: Record<string, number> = {};
  if (!type) return { typeSlug: "", params, notes };

  const extent = extentSpecFor(type);
  if (extent) {
    params[SCALE_PARAM_KEY] = readOne(
      q.get(SCALE_PARAM_KEY),
      SCALE_PARAM_KEY,
      extent.defaultM,
      extent.min,
      extent.max,
      extent.step,
      notes
    );
  }

  for (const s of type.sliders) {
    params[s.key] = readOne(q.get(s.key), s.key, s.default, s.min, s.max, s.step, notes);
  }

  // Anything left over is not a parameter of THIS type — usually a link made for
  // a different type, which is worth saying rather than ignoring.
  const known = new Set(["t", ...Object.keys(params)]);
  for (const key of q.keys()) {
    if (!known.has(key)) notes.push(`忽略不屬於此類型的參數「${key}」`);
  }

  return { typeSlug: type.slug, params, notes };
}

function readOne(
  raw: string | null,
  key: string,
  fallback: number,
  min: number,
  max: number,
  step: number,
  notes: string[]
): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    notes.push(`參數「${key}」的值「${raw}」不是數字,已改用預設值`);
    return fallback;
  }
  const coerced = coerce(n, min, max, step);
  if (n < min || n > max) {
    notes.push(`參數「${key}」的 ${n} 超出範圍 ${min}–${max},已收斂為 ${coerced}`);
  }
  return coerced;
}

/** True when the URL carries a state worth restoring (rather than a bare page). */
export function hasState(search: string): boolean {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return q.has("t") || [...q.keys()].length > 0;
}
