import { describe, expect, it } from "vitest";
import {
  SCALE_PARAM_KEY,
  SCALE_TIERS,
  countAcross,
  formatMetres,
  formatMm,
  freqFromWavelength,
  gridCountsFromPitch,
  heightM,
  isScaleTier,
  physicalWidthM,
  pointsInArea,
  resolveWidthM,
  scaleBarMetres,
  wavesAcross,
  type ScaleTier,
} from "../scale";

/**
 * The derivations behind every count-based slider. These were previously only
 * checked by driving a browser over 48 types, which takes minutes; the maths
 * itself is pure, so it belongs here where it runs in milliseconds.
 *
 * The expected values come from the table in docs/CANVAS-SCALE.md, which is the
 * record of what the sliders were tuned to produce. If a change here fails, the
 * question is whether that table is still true — not whether to update the
 * number until it passes.
 */

describe("tier table", () => {
  const tiers = Object.keys(SCALE_TIERS) as ScaleTier[];

  it("has the four documented tiers with the documented defaults", () => {
    expect(tiers).toEqual(["material", "component", "space", "mass"]);
    expect(SCALE_TIERS.material.defaultM).toBe(0.6);
    expect(SCALE_TIERS.component.defaultM).toBe(2);
    expect(SCALE_TIERS.space.defaultM).toBe(8);
    expect(SCALE_TIERS.mass.defaultM).toBe(40);
  });

  it("keeps every default inside its own range and on its own step grid", () => {
    for (const t of tiers) {
      const { min, max, step, defaultM } = SCALE_TIERS[t];
      expect(min, `${t} min < max`).toBeLessThan(max);
      expect(defaultM, `${t} default >= min`).toBeGreaterThanOrEqual(min);
      expect(defaultM, `${t} default <= max`).toBeLessThanOrEqual(max);
      // Off-grid defaults are the bug a0b40e4's slider audit was written to
      // catch; the extent slider needs the same guarantee.
      const steps = (defaultM - min) / step;
      expect(Math.abs(steps - Math.round(steps)), `${t} default on step grid`).toBeLessThan(1e-9);
    }
  });

  it("overlaps at the boundaries so a type on one can reach its neighbour", () => {
    // Documented as deliberate in docs/CANVAS-SCALE.md: 1.2/2, 5/8, 20/40.
    expect(SCALE_TIERS.material.max).toBeGreaterThan(SCALE_TIERS.component.min);
    expect(SCALE_TIERS.component.max).toBeGreaterThan(SCALE_TIERS.space.min);
    expect(SCALE_TIERS.space.max).toBeGreaterThan(SCALE_TIERS.mass.min);
  });

  it("recognises exactly the four tier names", () => {
    for (const t of tiers) expect(isScaleTier(t)).toBe(true);
    for (const bad of ["Material", "component ", "furniture", "", null, 3])
      expect(isScaleTier(bad)).toBe(false);
  });
});

describe("width resolution", () => {
  it("prefers the params value over the tier default", () => {
    expect(resolveWidthM("component", { [SCALE_PARAM_KEY]: 3.5 })).toBe(3.5);
    expect(resolveWidthM("component", {})).toBe(SCALE_TIERS.component.defaultM);
  });

  it("falls back for the no-tier types rather than inventing a width", () => {
    // The four Gray-Scott types declare no tier, so a generator reading a width
    // must get the caller's fallback, not a tier default.
    expect(physicalWidthM({}, 1.75)).toBe(1.75);
    expect(physicalWidthM({ [SCALE_PARAM_KEY]: 6 }, 1.75)).toBe(6);
  });
});

describe("count derivations", () => {
  it("derives a count along an extent, never below the floor", () => {
    expect(countAcross(2, 100)).toBe(20); // 2m / 100mm
    expect(countAcross(2, 140)).toBe(14); // 14.28 -> 14
    expect(countAcross(8, 570)).toBe(14); // 14.03 -> 14
    // A pitch coarser than the whole extent must still draw something.
    expect(countAcross(0.5, 4000)).toBe(2);
    expect(countAcross(0.5, 4000, 5)).toBe(5);
  });

  it("derives grid rows from the canvas aspect, not from the width twice", () => {
    // aspect is height/width, so a 4:3-tall canvas gets more rows than columns.
    const g = gridCountsFromPitch(0.6, 34, 4 / 3);
    expect(g.cols).toBe(18);
    expect(g.rows).toBe(24);
    expect(g.total).toBe(g.cols * g.rows);
    // Square canvas: rows track cols.
    expect(gridCountsFromPitch(2, 100, 1).rows).toBe(20);
  });

  it("converts a wavelength to waves across the extent", () => {
    expect(wavesAcross(250, 2)).toBe(8); // 2m / 250mm
    expect(wavesAcross(2700, 2)).toBeCloseTo(0.741, 3); // wider than the canvas
  });

  it("scales an area density by the actual area", () => {
    expect(heightM(8, 0.75)).toBe(6);
    // 1.6 pts/m^2 over 8m x 6m = 76.8 -> 77
    expect(pointsInArea(1.6, 8, 0.75)).toBe(77);
    expect(pointsInArea(0.001, 0.2, 0.75)).toBe(4); // floor, never an empty field
  });

  it("turns a wavelength into a per-pixel spatial frequency", () => {
    // Radians per pixel: 384px showing 2m at a 500mm wavelength is 96px per wave.
    const base = freqFromWavelength(500, 2, 384);
    expect(base).toBeCloseTo((2 * Math.PI) / 96, 10);

    // Halving the wavelength doubles the frequency.
    expect(freqFromWavelength(250, 2, 384)).toBeCloseTo(base * 2, 10);

    // Widening the canvas RAISES radians-per-pixel, because the same physical
    // wave now spans fewer pixels. Worth pinning: the intuition that a bigger
    // canvas means a lower frequency is backwards, and this is the conversion
    // the two per-pixel-frequency generators depend on.
    expect(freqFromWavelength(500, 4, 384)).toBeCloseTo(base * 2, 10);
  });
});

describe("documented per-type counts (aspect-independent ones)", () => {
  /**
   * The tuning promise in docs/CANVAS-SCALE.md is that each pitch default derives
   * the count the slider used to be pinned at, so the first paint did not change.
   *
   * Only the width-derived types are asserted here. The rest of that table
   * (bands, grain lines, the three area densities) depends on the canvas aspect,
   * which PlaygroundCanvas measures off the live CSS box — so their documented
   * numbers describe one viewport rather than a property of the maths, and
   * pinning them here would be asserting a layout, not a derivation.
   */
  const CASES: Array<[string, ScaleTier, number, number]> = [
    // type, tier, pitch mm, documented count
    ["fixed-aperture-grid", "component", 100, 20],
    ["deep-well-shadow", "component", 140, 14],
    ["directional-louver-aperture", "component", 170, 12],
    ["graduated-pinhole", "component", 45, 44],
    ["ribbed-mass-buffer", "component", 170, 12],
    ["minimal-surface-shell", "space", 570, 14],
    ["acoustic-diffusion-pattern", "material", 34, 18],
  ];

  for (const [type, tier, pitchMm, expected] of CASES) {
    it(`${type}: ${SCALE_TIERS[tier].defaultM}m / ${pitchMm}mm = ${expected}`, () => {
      expect(countAcross(SCALE_TIERS[tier].defaultM, pitchMm)).toBe(expected);
    });
  }

  it("corrugated-thermal-skin: 2m / 250mm = 8 waves", () => {
    expect(wavesAcross(250, SCALE_TIERS.component.defaultM)).toBe(8);
  });
});

describe("scale bar", () => {
  it("picks a round length that stays a readable fraction of the canvas", () => {
    // One per tier default, as listed in docs/CANVAS-SCALE.md §A4.
    expect(scaleBarMetres(0.6)).toBe(0.1);
    expect(scaleBarMetres(2)).toBe(0.5);
    expect(scaleBarMetres(8)).toBe(2);
    expect(scaleBarMetres(40)).toBe(10);
  });

  it("never returns a bar wider than the canvas it sits on", () => {
    for (let w = 0.15; w <= 120; w += 0.15) {
      expect(scaleBarMetres(w), `bar fits at ${w.toFixed(2)}m`).toBeLessThanOrEqual(w);
    }
  });
});

describe("formatting", () => {
  it("shows mm as mm and promotes to m past a metre", () => {
    expect(formatMm(50)).toBe("50 mm");
    expect(formatMm(570)).toBe("570 mm");
    expect(formatMm(999)).toBe("999 mm");
    expect(formatMm(1000)).toBe("1.0 m");
    expect(formatMm(2700)).toBe("2.7 m");
    expect(formatMm(13000)).toBe("13.0 m");
  });

  it("keeps a sub-metre width in cm and drops the pointless decimal", () => {
    expect(formatMetres(0.1)).toBe("10 cm");
    expect(formatMetres(0.6)).toBe("60 cm");
    expect(formatMetres(2)).toBe("2 m");
    expect(formatMetres(8)).toBe("8 m");
    expect(formatMetres(2.5)).toBe("2.5 m");
    expect(formatMetres(40)).toBe("40 m");
  });
});
