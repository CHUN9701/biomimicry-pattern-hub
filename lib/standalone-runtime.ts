/**
 * The contract between lib/ and standalone.html.
 *
 * standalone.html used to carry a hand-written second implementation of
 * everything in this file — 5,024 lines of it, including all 60 generators.
 * Every change had to be made twice, and the physical-extent work cost 479
 * lines there against 79 in lib/generators.ts. Every drift between the two
 * builds so far traces back to that duplication.
 *
 * Now scripts/build-standalone.mjs bundles this module into standalone.html as
 * `window.BPH`, and the file keeps only what is genuinely its own: the vanilla
 * DOM/hash-router UI shell and its WebGL mesh-gradient driver.
 *
 * Adding to this list is how you give the standalone build something new. The
 * names are deliberately the exact set the UI shell destructures — see
 * docs/STANDALONE-BUILD.md.
 */

export { rgba } from "./canvasUtils";
export { hexToRgbNorm } from "./colors";
export { AMBIENT_COLORS, categories, getCategory, getVariant } from "./data";
export { createGenerator } from "./generators";
export { GS_ZONES, ZONE_FILL, ZONE_LABELS } from "./grayScottZones";
export {
  SCALE_PARAM_KEY,
  SCALE_TIERS,
  countAcross,
  formatMetres,
  formatMm,
  gridCountsFromPitch,
  heightM,
  pointsInArea,
  scaleBarMetres,
  wavesAcross,
} from "./scale";
export { FRAG_SHADER, VERT_SHADER } from "./shaders";
export { getSubcategoryTypes, isVariantExplorerReady } from "./subcategoryTypes";

// The one piece that is data rather than code. Bundling it is what retires
// scripts/embed-json.py: the two copies can no longer disagree because there is
// only one copy.
export { default as subcategoryData } from "./biomimicry-subcategories.json";
