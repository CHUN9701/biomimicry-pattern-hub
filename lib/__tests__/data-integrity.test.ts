import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generatorKeys, hasGenerator } from "../generators";
import { categories } from "../data";
import { SCALE_PARAM_KEY, isScaleTier } from "../scale";
import {
  allPatternTypes,
  allSubcategories,
  auditAllSliders,
  isValidSlider,
} from "../subcategoryTypes";

/**
 * Which params each generator actually reads, taken from the source.
 *
 * Static analysis rather than execution: running a generator would need a real
 * canvas, and the question here is what the code references, not what one draw
 * call happens to touch — a param read only inside an `if` branch still has to be
 * declared. Both factory forms are handled: `() => ({ ... })` for the stateless
 * ones and `() => { ... }` for the nine that close over simulation state.
 */
function readGeneratorSource() {
  const src = readFileSync(path.join(__dirname, "../generators.ts"), "utf8");

  const matchBraces = (openIndex: number) => {
    let depth = 0;
    for (let i = openIndex; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) return i;
    }
    throw new Error("unbalanced braces in lib/generators.ts");
  };

  const factories: Record<string, Set<string>> = {};
  for (const m of src.matchAll(/const (\w+): Factory = \(\) => (\(\{|\{)/g)) {
    const bodyStart = m.index! + m[0].length;
    const body = src.slice(bodyStart, matchBraces(bodyStart - 1));
    factories[m[1]] = new Set([...body.matchAll(/\bp\.([A-Za-z_]\w*)/g)].map((x) => x[1]));
  }

  const regStart = src.indexOf("{", src.indexOf("const registry: Record<string, Factory>"));
  const registry: Record<string, string> = {};
  for (const line of src.slice(regStart + 1, matchBraces(regStart)).split("\n")) {
    const entry = line.trim().replace(/,$/, "");
    if (!entry || entry.startsWith("//")) continue;
    const [key, value] = entry.includes(":")
      ? entry.split(":").map((s) => s.trim().replace(/^"|"$/g, ""))
      : [entry, entry];
    registry[key] = value;
  }

  return { factories, registry };
}

/**
 * The content invariants that docs/OPEN-ITEMS.md §03 tracked as a table of
 * hand-counted numbers ("48 types, 145 sliders, 60 generators, 0 orphans").
 *
 * Those counts were real measurements, but re-deriving them meant driving a
 * browser through all 48 types, so in practice they were re-checked rarely and
 * the doc's own numbers went stale — B0 shipped claiming 9 px sliders when there
 * are 15. None of this needs a browser: it is all a property of the JSON plus the
 * registry, so it runs here in milliseconds and fails the moment it stops being
 * true.
 */

// Read through subcategoryTypes rather than importing the JSON directly, so these
// checks see the same typed view of the data the app does.
const types = allPatternTypes();
const subcategories = allSubcategories();
const sliders = types.flatMap((t) => t.sliders ?? []);

describe("content completeness", () => {
  it("has 12 fully speced 分類2, each with exactly 4 types", () => {
    expect(subcategories).toHaveLength(12);
    for (const s of subcategories) {
      expect(s.types, `${s.category2_id} type count`).toHaveLength(4);
    }
    expect(types).toHaveLength(48);
  });

  it("gives every type the three explanation fields", () => {
    // The info panel renders all three; a missing one is a blank section rather
    // than a crash, which is exactly the kind of gap a browser check misses.
    for (const t of types) {
      expect(t.description, `${t.slug} description`).toBeTruthy();
      expect(t.principle, `${t.slug} principle`).toBeTruthy();
      expect(t.spatialApplication, `${t.slug} spatialApplication`).toBeTruthy();
    }
  });

  it("gives every type a unique slug", () => {
    const slugs = types.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(types.length);
  });
});

describe("sliders", () => {
  it("has 145 sliders and every one of them is structurally valid", () => {
    expect(sliders).toHaveLength(145);
    for (const s of sliders) expect(isValidSlider(s), `slider ${s.key}`).toBe(true);
    // auditAllSliders is what the app itself gates on, so it must agree.
    expect(auditAllSliders()).toEqual([]);
  });

  it("puts every default on its own step grid, inside its own range", () => {
    for (const s of sliders) {
      expect(s.min, `${s.key} min < max`).toBeLessThan(s.max);
      expect(s.step, `${s.key} step > 0`).toBeGreaterThan(0);
      expect(s.default, `${s.key} default >= min`).toBeGreaterThanOrEqual(s.min);
      expect(s.default, `${s.key} default <= max`).toBeLessThanOrEqual(s.max);
      const steps = (s.default - s.min) / s.step;
      // Tolerance because 0.1-style steps are not exact in binary; the failure
      // this guards against is a default landing visibly between two stops.
      expect(Math.abs(steps - Math.round(steps)), `${s.key} default on grid`).toBeLessThan(1e-6);
    }
  });

  it("gives every slider a Chinese label", () => {
    // 24d3ed1 added all 145. lib/data.ts's fallback sliders still have none
    // (OPEN-ITEMS B1) — that path is not covered here because it is not reached
    // while all 12 分類2 pass the readiness gate.
    for (const s of sliders) expect(s.labelZh, `${s.key} labelZh`).toBeTruthy();
  });
});

describe("generators", () => {
  it("resolves every type's generator in the registry", () => {
    for (const t of types) {
      expect(t.generator, `${t.slug} declares a generator`).toBeTruthy();
      expect(hasGenerator(t.generator!), `${t.slug} -> ${t.generator}`).toBe(true);
    }
  });

  it("has no orphan generators", () => {
    // 60 registered = 48 JSON types + 12 lib/data.ts variant fallbacks. An orphan
    // is dead drawing code; 852c8a3 deleted a batch of them and this is what keeps
    // that from silently regrowing.
    const reachable = new Set<string>([
      ...types.map((t) => t.generator!),
      ...categories.flatMap((c) => c.variants.map((v) => v.generator)),
    ]);
    const orphans = generatorKeys().filter((k) => !reachable.has(k));
    expect(orphans).toEqual([]);
    expect(generatorKeys()).toHaveLength(60);
  });

  it("declares a slider for every param its generator reads, and no extras", () => {
    // The check that catches a renamed slider key. A generator reading p.foo while
    // the JSON declares bar draws with undefined — usually not a crash, just a
    // shape that quietly stops responding to its slider. OPEN-ITEMS §03 tracked
    // this as "48 types, zero mismatch" measured by hand; here it is derived.
    const { factories, registry } = readGeneratorSource();

    // Guard the extraction before trusting its output: a parser that silently
    // matched nothing would make this test pass by testing nothing.
    expect(Object.keys(factories).length, "factories parsed").toBe(60);
    expect(Object.keys(registry).length, "registry entries").toBe(60);
    for (const [key, factory] of Object.entries(registry))
      expect(factories[factory], `registry ${key} -> ${factory}`).toBeDefined();

    const problems: string[] = [];
    for (const t of types) {
      const reads = factories[registry[t.generator!]];
      // Every generator in this project is parameterised; an empty set means the
      // parser lost the body, which would make the comparison below vacuous.
      expect(reads.size, `${t.slug}: params extracted from ${t.generator}`).toBeGreaterThan(0);
      const declared = new Set([...(t.sliders ?? []).map((s) => s.key), SCALE_PARAM_KEY]);
      const undeclared = [...reads].filter((p) => !declared.has(p));
      const unread = [...declared].filter((p) => p !== SCALE_PARAM_KEY && !reads.has(p));
      if (undeclared.length) problems.push(`${t.slug} reads undeclared: ${undeclared.join(", ")}`);
      if (unread.length) problems.push(`${t.slug} declares unread: ${unread.join(", ")}`);
    }
    expect(problems).toEqual([]);
  });
});

describe("physical scale wiring", () => {
  const GRAY_SCOTT = [
    "turing-pattern-skin",
    "cellular-growth-simulation",
    "coral-growth-pattern",
    "diffusion-limited-aggregation",
  ];

  it("gives 44 types a valid tier and deliberately withholds it from 4", () => {
    const withTier = types.filter((t) => t.scaleTier);
    expect(withTier).toHaveLength(44);
    for (const t of withTier) expect(isScaleTier(t.scaleTier), `${t.slug} tier`).toBe(true);

    const without = types.filter((t) => !t.scaleTier).map((t) => t.slug);
    // Named, not just counted: "some 4 types have no tier" would still pass if the
    // tier went missing from the wrong four.
    expect(without.sort()).toEqual([...GRAY_SCOTT].sort());
  });

  it("has 15 derive sliders, each owned by a type that has an extent", () => {
    const derived = sliders.filter((s) => s.derive);
    expect(derived).toHaveLength(15);
    for (const s of derived) {
      // A derived slider on a type with no extent has nothing to derive from.
      const owner = types.find((t) => (t.sliders ?? []).some((x) => x.key === s.key));
      expect(owner?.scaleTier, `${s.key}'s type declares a tier`).toBeTruthy();
    }
  });

  it("keeps each derive slider's displayed unit consistent with deriveUnit", () => {
    // deriveUnit is optional and absent means mm (PlaygroundCanvas reads
    // `deriveUnit === "m" ? value * 1000 : value`). So a slider labelled in metres
    // that forgets deriveUnit is read as millimetres — a silent 1000x error in the
    // derived count, with nothing on screen to suggest anything is wrong. Only
    // flowWavelength is in metres today; this is what stops the next one being
    // added wrong.
    for (const s of sliders.filter((x) => x.derive)) {
      const unit = (s.unit ?? "").trim();
      if (s.derive === "areaDensity") {
        // Not a length: the count comes from points/m², so deriveUnit is unused.
        expect(unit, `${s.key} unit`).toBe("點/m²");
        expect(s.deriveUnit, `${s.key} should not declare deriveUnit`).toBeUndefined();
        continue;
      }
      expect(["mm", "m"], `${s.key} unit`).toContain(unit);
      if (unit === "m") expect(s.deriveUnit, `${s.key} is in metres`).toBe("m");
      else expect(s.deriveUnit ?? "mm", `${s.key} is in millimetres`).toBe("mm");
    }
  });

  it("locks the px-unit slider inventory that B0 has to convert", () => {
    // OPEN-ITEMS B0 first shipped with these numbers wrong (9 sliders, 7 keys
    // listed, apertureScale and louverLength missed). Asserting the measurement
    // means the docs can be checked against something instead of trusted.
    const px = sliders.filter((s) => s.unit === "px");
    expect(px).toHaveLength(15);
    expect([...new Set(px.map((s) => s.key))].sort()).toEqual([
      "apertureScale",
      "branchWidth",
      "cellSize",
      "lineWidth",
      "louverLength",
      "memberThickness",
      "memberWidth",
      "strutThickness",
      "wallThickness",
    ]);
    const owners = types.filter((t) => (t.sliders ?? []).some((s) => s.unit === "px"));
    expect(owners).toHaveLength(14);
  });
});
