// ---------------------------------------------------------------------------
// Physical scale of the canvas (docs/OPEN-ITEMS.md A1 + A2).
//
// A canvas with no stated physical extent can't tell a student whether they are
// looking at a 40mm surface grain or a 40m roof — and every density slider is
// meaningless without it ("12 ribs" of what?). So each type declares how wide
// its canvas is in metres, and the count-based sliders become spacing sliders
// with the count derived from that width.
//
// WHY FOUR FIXED TIERS rather than a bespoke width per type: the canvas has to
// stay comparable across the 48 types. Bespoke widths (2.4m here, 3m there)
// would mean two patterns that look equally dense are silently 20x apart, and
// 48 numbers to keep straight. Four tiers keep the reading consistent — within
// a tier the canvas means exactly the same thing — and were checked against all
// 13 density keys: every derived spacing still lands in a range a designer
// would actually draw (see docs/SCALE-PROPOSAL-draft.md for the numbers).
//
// The tier ranges deliberately overlap slightly at the edges (1.2 / 2, 5 / 8,
// 20 / 40) so a type sitting near a boundary can still be pushed into its
// neighbour's territory without the slider dead-ending.
// ---------------------------------------------------------------------------

export const SCALE_PARAM_KEY = "canvasWidthM";

export type ScaleTier = "material" | "component" | "space" | "mass";

export type ScaleTierSpec = {
  labelZh: string;
  /** What the extent means for this tier, in plain words. */
  hintZh: string;
  defaultM: number;
  min: number;
  max: number;
  step: number;
};

export const SCALE_TIERS: Record<ScaleTier, ScaleTierSpec> = {
  material: {
    labelZh: "材料",
    hintZh: "一片板材 / 表面的一塊",
    defaultM: 0.6,
    min: 0.15,
    max: 1.2,
    step: 0.05,
  },
  component: {
    labelZh: "構件",
    hintZh: "一個立面單元 / 一片牆",
    defaultM: 2,
    min: 0.5,
    max: 5,
    step: 0.1,
  },
  space: {
    labelZh: "空間",
    hintZh: "一個房間 / 一跨結構",
    defaultM: 8,
    min: 2,
    max: 20,
    step: 0.5,
  },
  mass: {
    labelZh: "量體",
    hintZh: "整棟建築 / 一片地景",
    defaultM: 40,
    min: 10,
    max: 120,
    step: 1,
  },
};

export function isScaleTier(v: unknown): v is ScaleTier {
  return typeof v === "string" && v in SCALE_TIERS;
}

/** Physical width in metres for a tier, honouring a user-moved slider value. */
export function resolveWidthM(tier: ScaleTier, params: Record<string, number>): number {
  const v = params[SCALE_PARAM_KEY];
  const spec = SCALE_TIERS[tier];
  return Number.isFinite(v) ? Math.min(spec.max, Math.max(spec.min, v)) : spec.defaultM;
}

/**
 * The extent a generator should draw at, read straight from params.
 *
 * Generators deliberately do NOT know their own tier — the tier lives in the
 * JSON, and repeating it in the generator is one more place for the two to
 * disagree. Every caller (the variant page, the mini previews, standalone)
 * seeds the extent, so `fallbackM` is only reached if a new caller forgets to;
 * it is the type's tier default, which keeps that failure looking right rather
 * than looking random.
 */
export function physicalWidthM(params: Record<string, number>, fallbackM: number): number {
  const v = params[SCALE_PARAM_KEY];
  return Number.isFinite(v) && v > 0 ? v : fallbackM;
}

// ---------------------------------------------------------------------------
// Derived counts.
//
// The slider sets a spacing; the COUNT falls out of the physical width. This is
// the point of the whole change: drag the extent to 5m at the same 100mm pitch
// and you get more apertures, because a wider wall at the same pitch really
// does. The clamp is on the tier's max width, not on the count — a count that
// gets silently clamped reads to the student as a broken slider.
// ---------------------------------------------------------------------------

export type GridCounts = { cols: number; rows: number; total: number };

/** Columns/rows for a pitch-family slider (A2's "間距 mm" group). */
export function gridCountsFromPitch(
  widthM: number,
  pitchMm: number,
  aspect: number // canvas height / width
): GridCounts {
  const cols = Math.max(2, Math.round((widthM * 1000) / pitchMm));
  const rows = Math.max(2, Math.round(cols * aspect));
  return { cols, rows, total: cols * rows };
}

/**
 * How many items a spacing yields across ONE axis.
 *
 * Which axis matters, and it is decided by what the generator actually draws,
 * not by what the slider is called: ribbed-mass-buffer's ribs are vertical bars
 * spaced across the WIDTH, while tactile-nature-surface's grain lines are
 * horizontal and spaced down the HEIGHT. Calling both "density" is how they
 * ended up sharing a unit that fits neither.
 */
export function countAcross(extentM: number, pitchMm: number, min = 2): number {
  return Math.max(min, Math.round((extentM * 1000) / pitchMm));
}

/** Physical height of the canvas, from its width and its laid-out proportions. */
export function heightM(widthM: number, aspect: number): number {
  return widthM * aspect;
}

/**
 * Spatial frequency (radians per pixel) for a wavelength given in mm.
 *
 * The wave generators take a per-pixel frequency, which is why their old
 * sliders were unitless: 0.006 × waveFrequency means nothing physically until
 * the canvas has a width in metres. Going through the wavelength makes the
 * number on the slider the same number a designer would dimension on a section.
 */
export function freqFromWavelength(wavelengthMm: number, widthM: number, canvasPxW: number): number {
  const pxPerMetre = canvasPxW / widthM;
  const wavelengthPx = (wavelengthMm / 1000) * pxPerMetre;
  return (2 * Math.PI) / Math.max(1e-6, wavelengthPx);
}

/**
 * A physical length in mm, as pixels on this canvas.
 *
 * This is what makes a thickness slider mean something. The thickness sliders
 * used to be in raw canvas pixels, which are DEVICE pixels: the same view showed
 * a 1.5px member as half as thick, relative to the canvas, on a Retina display as
 * on a non-Retina one. Once the canvas has a width in metres, that is
 * indefensible — a 150mm structural member is 150mm on both screens.
 *
 * Both arguments are needed because pixels-per-metre is the ratio between them;
 * neither the canvas size nor the extent means anything on its own here.
 *
 * Floored at 0.35px rather than 0 so a thin member stays visible when the extent
 * is dragged out to a tier's maximum. Below roughly a third of a pixel Canvas2D
 * antialiasing fades a stroke to nearly nothing, and a member silently vanishing
 * reads as a broken generator rather than as "you zoomed out".
 */
export function pxFromMm(mm: number, widthM: number, canvasPxW: number): number {
  return Math.max(0.35, (mm / 1000) * (canvasPxW / Math.max(1e-6, widthM)));
}

/** How many full waves of this wavelength fit across the canvas width. */
export function wavesAcross(wavelengthMm: number, widthM: number): number {
  return (widthM * 1000) / wavelengthMm;
}

/**
 * Point count for an area-density slider (points per m²). The count grows with
 * the area, so a bigger extent really does need more drainage points — but the
 * tier's max width is what bounds it, since space colonization slows down with
 * attractor count.
 */
export function pointsInArea(densityPerM2: number, widthM: number, aspect: number): number {
  return Math.max(4, Math.round(densityPerM2 * widthM * heightM(widthM, aspect)));
}

/** 570 -> "570 mm", 13000 -> "13.0 m" — for readouts, not for slider values. */
export function formatMm(mm: number): string {
  return mm >= 1000 ? `${(mm / 1000).toFixed(1)} m` : `${Math.round(mm)} mm`;
}

const BAR_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

/**
 * A round metre value for the on-canvas scale bar: the largest "nice" number
 * that still occupies under a third of the canvas. Numbers alone need mental
 * arithmetic; a drawn bar is read at a glance, which is the whole reason A4
 * ranks this first.
 */
export function scaleBarMetres(widthM: number): number {
  const target = widthM * 0.3;
  let best = BAR_STEPS[0];
  for (const s of BAR_STEPS) if (s <= target) best = s;
  return best;
}

/** 0.5 -> "50 cm", 2 -> "2 m" — whichever reads without a decimal point. */
export function formatMetres(m: number): string {
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${Number.isInteger(m) ? m : m.toFixed(1)} m`;
}
