export type GsZone = "extinct" | "uniform" | "spots" | "stripes" | "coral";

export const ZONE_LABELS: Record<GsZone, string> = {
  stripes: "條紋／迷宮",
  spots: "斑點／分裂",
  coral: "珊瑚狀",
  uniform: "均勻無圖樣",
  extinct: "滅絕",
};

/**
 * Pattern family at each sampled (feedRate, killRate) pair, covering the exact
 * ranges the sliders expose.
 *
 * PROVENANCE — read this before citing any of it. These labels come from an
 * automated sweep of THIS APP'S OWN simulation, not from published Pearson
 * parameter-space coordinates. Each cell was run to 5000 iterations (the
 * point at which patterns visibly settle) using the identical update rule,
 * grid size, seeding and diffusion coefficients as
 * createReactionDiffusionSim, then classified from pixel measurements:
 * max V concentration, coverage fraction, connected-component count and mean
 * component elongation. The classifier is a coarse heuristic — cells near a
 * boundary are approximate, and "spots" vs "stripes" across the transition is
 * a call the metrics make imperfectly. The UI states this limitation to the
 * user rather than presenting the map as authoritative.
 *
 * Two distinct patternless regimes are separated deliberately:
 *   extinct – V has died out entirely. An absorbing state, and exactly what
 *             the app's own `extinct` flag detects, so map and canvas overlay
 *             agree on the same cells.
 *   uniform – V is still abundant but spread evenly, so there is no pattern.
 *             The canvas simply goes flat here and NO overlay appears.
 *
 * Cross-checked against the running app at six cells spanning all regimes:
 * 6/6 agreement. Regenerate with scratchpad/scan-gs-node.js if the diffusion
 * coefficients, grid size or seeding ever change, since the boundaries move
 * with them.
 */
export const GS_ZONES: {
  fs: number[];
  ks: number[];
  grid: Record<string, GsZone>;
} = {
  fs: [0.02, 0.024, 0.028, 0.032, 0.036, 0.04, 0.044, 0.048, 0.052, 0.056, 0.06],
  ks: [0.05, 0.052, 0.054, 0.056, 0.058, 0.06, 0.062, 0.064, 0.066],
  grid: {
    "0.02|0.05": "stripes",
    "0.02|0.052": "stripes",
    "0.02|0.054": "stripes",
    "0.02|0.056": "spots",
    "0.02|0.058": "spots",
    "0.02|0.06": "extinct",
    "0.02|0.062": "extinct",
    "0.02|0.064": "extinct",
    "0.02|0.066": "extinct",
    "0.024|0.05": "stripes",
    "0.024|0.052": "stripes",
    "0.024|0.054": "stripes",
    "0.024|0.056": "stripes",
    "0.024|0.058": "spots",
    "0.024|0.06": "spots",
    "0.024|0.062": "extinct",
    "0.024|0.064": "extinct",
    "0.024|0.066": "extinct",
    "0.028|0.05": "uniform",
    "0.028|0.052": "spots",
    "0.028|0.054": "stripes",
    "0.028|0.056": "stripes",
    "0.028|0.058": "stripes",
    "0.028|0.06": "spots",
    "0.028|0.062": "spots",
    "0.028|0.064": "extinct",
    "0.028|0.066": "extinct",
    "0.032|0.05": "uniform",
    "0.032|0.052": "uniform",
    "0.032|0.054": "uniform",
    "0.032|0.056": "stripes",
    "0.032|0.058": "stripes",
    "0.032|0.06": "stripes",
    "0.032|0.062": "spots",
    "0.032|0.064": "spots",
    "0.032|0.066": "extinct",
    "0.036|0.05": "uniform",
    "0.036|0.052": "uniform",
    "0.036|0.054": "uniform",
    "0.036|0.056": "uniform",
    "0.036|0.058": "stripes",
    "0.036|0.06": "stripes",
    "0.036|0.062": "stripes",
    "0.036|0.064": "spots",
    "0.036|0.066": "extinct",
    "0.04|0.05": "uniform",
    "0.04|0.052": "uniform",
    "0.04|0.054": "uniform",
    "0.04|0.056": "uniform",
    "0.04|0.058": "uniform",
    "0.04|0.06": "stripes",
    "0.04|0.062": "stripes",
    "0.04|0.064": "spots",
    "0.04|0.066": "extinct",
    "0.044|0.05": "uniform",
    "0.044|0.052": "uniform",
    "0.044|0.054": "uniform",
    "0.044|0.056": "uniform",
    "0.044|0.058": "uniform",
    "0.044|0.06": "stripes",
    "0.044|0.062": "stripes",
    "0.044|0.064": "stripes",
    "0.044|0.066": "spots",
    "0.048|0.05": "uniform",
    "0.048|0.052": "uniform",
    "0.048|0.054": "uniform",
    "0.048|0.056": "uniform",
    "0.048|0.058": "uniform",
    "0.048|0.06": "stripes",
    "0.048|0.062": "stripes",
    "0.048|0.064": "stripes",
    "0.048|0.066": "spots",
    "0.052|0.05": "uniform",
    "0.052|0.052": "uniform",
    "0.052|0.054": "uniform",
    "0.052|0.056": "uniform",
    "0.052|0.058": "uniform",
    "0.052|0.06": "uniform",
    "0.052|0.062": "stripes",
    "0.052|0.064": "stripes",
    "0.052|0.066": "coral",
    "0.056|0.05": "uniform",
    "0.056|0.052": "uniform",
    "0.056|0.054": "uniform",
    "0.056|0.056": "uniform",
    "0.056|0.058": "uniform",
    "0.056|0.06": "uniform",
    "0.056|0.062": "stripes",
    "0.056|0.064": "stripes",
    "0.056|0.066": "stripes",
    "0.06|0.05": "uniform",
    "0.06|0.052": "uniform",
    "0.06|0.054": "uniform",
    "0.06|0.056": "uniform",
    "0.06|0.058": "uniform",
    "0.06|0.06": "uniform",
    "0.06|0.062": "stripes",
    "0.06|0.064": "stripes",
    "0.06|0.066": "coral",
  },
};
