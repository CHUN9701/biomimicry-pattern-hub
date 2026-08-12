import { describe, expect, it } from "vitest";
import { decodeState, encodeState, hasState, type UrlStateType } from "../urlState";
import { SCALE_PARAM_KEY, SCALE_TIERS } from "../scale";
import { allPatternTypes } from "../subcategoryTypes";

/**
 * A shared link is a citation: it goes in a student's report, and whoever opens it
 * has to see what the author saw. So the round trip is tested against every real
 * type, and every way a link can arrive damaged is tested explicitly — a
 * hand-edited or truncated URL must open something sensible rather than feed a
 * generator a NaN and present the result as a simulation.
 */

const TYPE: UrlStateType = {
  slug: "deep-well-shadow",
  scaleTier: "component",
  sliders: [
    { key: "sunAngle", label: "Sun Angle", min: 0, max: 90, step: 1, default: 25 },
    { key: "wellDepth", label: "Well Depth", min: 0, max: 100, step: 1, default: 70 },
    { key: "aperturePitch", label: "Pitch", min: 60, max: 250, step: 5, default: 140 },
  ],
};

describe("round trip", () => {
  it("survives encode → decode unchanged", () => {
    const params = { sunAngle: 42, wellDepth: 30, aperturePitch: 175, [SCALE_PARAM_KEY]: 3.5 };
    const decoded = decodeState(encodeState(TYPE, params), [TYPE]);
    expect(decoded.typeSlug).toBe("deep-well-shadow");
    expect(decoded.params).toEqual(params);
    expect(decoded.notes).toEqual([]);
  });

  it("writes every value, including ones still at their default", () => {
    // Deliberate: a link whose meaning depends on the defaults at OPENING time
    // would silently change when a default is retuned, and B0 retuned 13 of them.
    const q = new URLSearchParams(encodeState(TYPE, {}));
    expect(q.get("t")).toBe("deep-well-shadow");
    expect(q.get("sunAngle")).toBe("25");
    expect(q.get("wellDepth")).toBe("70");
    expect(q.get("aperturePitch")).toBe("140");
    expect(q.get(SCALE_PARAM_KEY)).toBe("2");
  });

  it("is stable — the same state always produces the same string", () => {
    const a = encodeState(TYPE, { sunAngle: 10, wellDepth: 20, aperturePitch: 100 });
    const b = encodeState(TYPE, { aperturePitch: 100, wellDepth: 20, sunAngle: 10 });
    expect(a).toBe(b);
  });

  it("round-trips all 48 real types at their own defaults", () => {
    const types = allPatternTypes().map((t) => ({
      slug: t.slug!,
      sliders: t.sliders ?? [],
      scaleTier: t.scaleTier ?? null,
    }));
    expect(types).toHaveLength(48);

    for (const type of types) {
      const opened: Record<string, number> = Object.fromEntries(
        type.sliders.map((s) => [s.key, s.default])
      );
      if (type.scaleTier) {
        opened[SCALE_PARAM_KEY] =
          SCALE_TIERS[type.scaleTier as keyof typeof SCALE_TIERS].defaultM;
      }
      const decoded = decodeState(encodeState(type, opened), types);
      expect(decoded.typeSlug, `${type.slug} slug`).toBe(type.slug);
      expect(decoded.params, `${type.slug} params`).toEqual(opened);
      expect(decoded.notes, `${type.slug} notes`).toEqual([]);
    }
  });
});

describe("damaged links still open something", () => {
  it("falls back to the first type when the type is unknown", () => {
    const d = decodeState("?t=not-a-real-type&sunAngle=10", [TYPE]);
    expect(d.typeSlug).toBe("deep-well-shadow");
    expect(d.notes.join()).toContain("not-a-real-type");
  });

  it("uses the default when a value is not a number", () => {
    const d = decodeState("?t=deep-well-shadow&sunAngle=abc", [TYPE]);
    expect(d.params.sunAngle).toBe(25);
    expect(d.notes.join()).toContain("sunAngle");
  });

  it("clamps out-of-range values and says so", () => {
    const d = decodeState("?t=deep-well-shadow&sunAngle=999&wellDepth=-40", [TYPE]);
    expect(d.params.sunAngle).toBe(90);
    expect(d.params.wellDepth).toBe(0);
    expect(d.notes).toHaveLength(2);
  });

  it("snaps a value that sits between two stops onto the step grid", () => {
    // aperturePitch steps by 5, so 143 is not a position the slider can hold.
    const d = decodeState("?t=deep-well-shadow&aperturePitch=143", [TYPE]);
    expect(d.params.aperturePitch).toBe(145);
    expect(d.notes).toEqual([]); // snapping is not an error, just a resolution
  });

  it("fills in everything a truncated link left out", () => {
    const d = decodeState("?t=deep-well-shadow&sunAngle=40", [TYPE]);
    expect(d.params).toEqual({
      sunAngle: 40,
      wellDepth: 70,
      aperturePitch: 140,
      [SCALE_PARAM_KEY]: 2,
    });
  });

  it("reports parameters that belong to some other type", () => {
    const d = decodeState("?t=deep-well-shadow&feedRate=0.04", [TYPE]);
    expect(d.notes.join()).toContain("feedRate");
    expect(d.params.feedRate).toBeUndefined();
  });

  it("opens at defaults for an empty search string", () => {
    const d = decodeState("", [TYPE]);
    expect(d.typeSlug).toBe("deep-well-shadow");
    expect(d.params.sunAngle).toBe(25);
    expect(d.notes).toEqual([]);
  });

  it("gives a no-tier type no extent parameter to argue about", () => {
    const noTier: UrlStateType = { slug: "turing-pattern-skin", sliders: TYPE.sliders };
    const d = decodeState(encodeState(noTier, {}), [noTier]);
    expect(d.params[SCALE_PARAM_KEY]).toBeUndefined();
    // An extent forced in from outside is not a parameter of this type.
    const forced = decodeState(`?t=turing-pattern-skin&${SCALE_PARAM_KEY}=9`, [noTier]);
    expect(forced.params[SCALE_PARAM_KEY]).toBeUndefined();
    expect(forced.notes.join()).toContain(SCALE_PARAM_KEY);
  });
});

describe("hasState", () => {
  it("distinguishes a bare page from a shared link", () => {
    expect(hasState("")).toBe(false);
    expect(hasState("?")).toBe(false);
    expect(hasState("?t=deep-well-shadow")).toBe(true);
    expect(hasState("sunAngle=40")).toBe(true);
  });
});
