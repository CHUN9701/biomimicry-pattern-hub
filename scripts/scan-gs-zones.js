// Gray-Scott zone sweep, run directly in Node instead of through the browser.
//
// Same reason as always: the browser version needed ~13s of wall clock per cell
// just to reach steady state, and 4.2s (the first attempt) left cells mid-
// transient, which biased every label toward "spots". Here the identical update
// rule runs to real convergence in milliseconds.
//
// The math below is copied verbatim from createReactionDiffusionSim in
// lib/generators.ts — same grid size, same seeding, same diffusion
// coefficients, same clamping. A mismatch here would make the map lie about the
// app, so cross-check a few cells against the browser before trusting it.
//
// Regenerates the data in lib/grayScottZones.ts (and the copy embedded in
// standalone.html). Run when the diffusion coefficients, grid size, seeding or
// the sliders' f/k ranges change, since the zone boundaries move with them:
//
//   node scripts/scan-gs-zones.js 5000
//
// 5000 iterations is calibrated to where patterns visibly settle in the app
// (~240 sim steps/sec on screen at diffusionSpeed 4, so ~20s of watching).
const fs = require("fs");

const GW = 120, GH = 90, N = GW * GH;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const idx = (x, y) => {
  const cx = x < 0 ? 0 : x >= GW ? GW - 1 : x;
  const cy = y < 0 ? 0 : y >= GH ? GH - 1 : y;
  return cy * GW + cx;
};

function run(f, k, iterations) {
  let U = new Float32Array(N).fill(1);
  let V = new Float32Array(N).fill(0);
  let Un = new Float32Array(N);
  let Vn = new Float32Array(N);
  // seedBlobs(6, 3) with seedRun = 0
  const rand = mulberry32(42);
  for (let s = 0; s < 6; s++) {
    const sx = Math.floor(rand() * GW);
    const sy = Math.floor(rand() * GH);
    for (let y = sy - 3; y <= sy + 3; y++)
      for (let x = sx - 3; x <= sx + 3; x++) V[idx(x, y)] = 1;
  }
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        const u = U[i], v = V[i];
        const lapU = U[idx(x-1,y)] + U[idx(x+1,y)] + U[idx(x,y-1)] + U[idx(x,y+1)] - 4*u;
        const lapV = V[idx(x-1,y)] + V[idx(x+1,y)] + V[idx(x,y-1)] + V[idx(x,y+1)] - 4*v;
        const uvv = u * v * v;
        Un[i] = clamp(u + (0.16 * lapU - uvv + f * (1 - u)), 0, 1);
        Vn[i] = clamp(v + (0.08 * lapV + uvv - (f + k) * v), 0, 1);
      }
    }
    [U, Un] = [Un, U];
    [V, Vn] = [Vn, V];
  }
  return { U, V };
}

// Classify from the same scalar the canvas draws: val = clamp(U - V, 0, 1).
function classify(U, V) {
  // Two DIFFERENT patternless states, which an earlier version of this
  // classifier wrongly merged:
  //   extinct  – V is gone entirely (vmax ~ 0). Absorbing state; this is what
  //              the app's own `extinct` flag detects, so the map and the
  //              canvas overlay agree on exactly the same cells.
  //   uniform  – V is still present and abundant, but spread evenly with no
  //              spatial structure. Patternless, yet NOT extinct, and the app
  //              shows no overlay here — the canvas just goes flat.
  let vmax = 0;
  for (let i = 0; i < N; i++) if (V[i] > vmax) vmax = V[i];
  if (vmax < 0.005) return { zone: "extinct", vmax, coverage: 0, blobs: 0, elong: 0 };

  const val = new Float32Array(N);
  let mn = 2, mx = -1;
  for (let i = 0; i < N; i++) { val[i] = clamp(U[i] - V[i], 0, 1); if (val[i] < mn) mn = val[i]; if (val[i] > mx) mx = val[i]; }
  if (mx - mn < 0.08) return { zone: "uniform", vmax, coverage: 0, blobs: 0, elong: 0 };

  // "pattern" = the V-rich side, i.e. LOW val
  const thr = (mn + mx) / 2;
  const on = new Uint8Array(N);
  let cov = 0;
  for (let i = 0; i < N; i++) { on[i] = val[i] < thr ? 1 : 0; cov += on[i]; }
  const coverage = cov / N;

  const seen = new Uint8Array(N);
  let blobs = 0, elongSum = 0, counted = 0;
  const stack = new Int32Array(N);
  for (let s0 = 0; s0 < N; s0++) {
    if (!on[s0] || seen[s0]) continue;
    blobs++; let sp = 0; stack[sp++] = s0; seen[s0] = 1;
    let area = 0, perim = 0;
    while (sp > 0) {
      const q = stack[--sp]; area++;
      const x = q % GW, y = (q - x) / GW;
      const nb = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) { perim++; continue; }
        const j = ny * GW + nx;
        if (!on[j]) { perim++; continue; }
        if (!seen[j]) { seen[j] = 1; stack[sp++] = j; }
      }
    }
    if (area >= 4) { elongSum += perim / Math.sqrt(area); counted++; }
  }
  const elong = counted ? elongSum / counted : 0;

  // Buckets. Coverage separates a sparse field of isolated segments from a
  // space-filling one; elongation separates compact dots from long worms/mazes.
  let zone;
  if (coverage < 0.05) zone = "coral";
  else if (elong >= 5.5) zone = "stripes";
  else zone = "spots";
  return { zone, vmax, coverage, blobs, elong };
}

const ITER = Number(process.argv[2] || 20000);
const FS = []; for (let f = 0.020; f <= 0.0601; f += 0.004) FS.push(+f.toFixed(3));
const KS = []; for (let k = 0.050; k <= 0.0661; k += 0.002) KS.push(+k.toFixed(3));

const grid = {}, raw = [];
const t0 = Date.now();
for (const f of FS) {
  for (const k of KS) {
    const { U, V } = run(f, k, ITER);
    const c = classify(U, V);
    grid[`${f}|${k}`] = c.zone;
    raw.push({ f, k, ...c });
  }
  process.stderr.write("|");
}
process.stderr.write(`\n${ITER} iterations/cell, ${((Date.now()-t0)/1000).toFixed(1)}s total\n\n`);

const SYM = { extinct: ".", uniform: "-", spots: "o", stripes: "~", coral: "c" };
let out = "rows=feedRate  cols=killRate   .=extinct(V gone)  -=uniform(no pattern)  o=spots  ~=stripes/maze  c=coral\n\n      f\\k  ";
KS.forEach(k => { out += String(k).padStart(7); });
out += "\n";
for (const f of FS) {
  out += String(f).padStart(9) + "  ";
  for (const k of KS) out += SYM[grid[`${f}|${k}`]].padStart(7);
  out += "\n";
}
console.log(out);
fs.writeFileSync(__dirname + "/gs-zones-node.json", JSON.stringify({ fs: FS, ks: KS, grid, iterations: ITER }, null, 1));
fs.writeFileSync(__dirname + "/gs-zones-node-raw.json", JSON.stringify(raw, null, 1));
console.log("wrote gs-zones-node.json");
