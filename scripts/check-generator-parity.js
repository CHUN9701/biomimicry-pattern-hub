// Prove a generator refactor changed no pixels.
//
// Loads the hand-written generator implementation from an OLD git revision of
// standalone.html and the current lib/ bundle into one page, draws every type
// with both at identical params and identical draw-call sequences, and compares
// the resulting frames pixel by pixel.
//
//   node scripts/check-generator-parity.js
//   REF=<git-ref> node scripts/check-generator-parity.js
//
// Written for the migration that deleted standalone.html's 5,024-line second
// implementation (the default REF is the last revision that still had it), but
// it works against any revision whose standalone.html carried its own
// generators — so it stays useful for "did my refactor move any pixels?".
//
// Why pixels rather than assertions about the code: docs/OPEN-ITEMS.md §05
// records two occasions where analytically-reasonable checks passed while the
// canvas was wrong, including 145/145 sliders green while the canvas had
// collapsed to 2px. Nothing is trusted here that is not measured off a frame.
//
// Deliberately dependency-free apart from esbuild, same as check-scale.js:
// drives the cached Chromium over CDP using Node's global WebSocket.
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const REPO = path.resolve(__dirname, "..");
const DATA = require(path.join(REPO, "lib/biomimicry-subcategories.json"));
const REF = process.env.REF || "923fca8"; // last revision with the hand-written copy
const CHR =
  process.env.CHROMIUM_PATH ||
  "/Users/chun/Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium";
const PORT = Number(process.env.CDP_PORT || 9341);

// Tier defaults are restated rather than imported from lib/scale.ts: importing
// them would let a changed default pass by agreeing with itself. check-scale.js
// states the same reasoning for its own copy.
const TIER_DEFAULT_M = { material: 0.6, component: 2, space: 8, mass: 40 };

// The size a standalone playground canvas actually uses (docs/OPEN-ITEMS.md §03
// pins it at 384px wide), at dpr 1 so the comparison is device-independent.
const W = 384;
const H = 288;
// Three frames rather than one: a single t=0 frame would miss anything that only
// diverges after a stateful simulation has stepped. Both implementations get the
// same sequence, since each draw call advances the Gray-Scott and
// space-colonization sims.
const FRAMES = [0, 1.37, 4.2];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // ---- the old implementation, straight out of git -------------------------
  const oldSrc = execFileSync("git", ["show", `${REF}:standalone.html`], {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).split("\n");

  // Sliced by markers rather than line numbers, so this survives being pointed
  // at other revisions: from the top of the utility block to the close of
  // createGenerator.
  const from = oldSrc.findIndex((l) => l.includes("// Canvas / color utilities"));
  const genAt = oldSrc.findIndex((l) => /^\s*function createGenerator\(/.test(l));
  if (from < 0 || genAt < 0) {
    console.error(
      `${REF}:standalone.html does not look like a revision with its own generators ` +
        "(no utility block, or no createGenerator). Pick an older REF."
    );
    process.exit(1);
  }
  const to = oldSrc.findIndex((l, i) => i > genAt && /^\s{2}\}\s*$/.test(l));
  const region = oldSrc.slice(from, to + 1).join("\n");

  // ---- the current implementation, bundled the way the build does ----------
  // Bundling here rather than scraping the bundle back out of the generated HTML
  // keeps this honest about what lib/ currently contains.
  const bundle = require("esbuild").buildSync({
    entryPoints: [path.join(REPO, "lib/standalone-runtime.ts")],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "BPH",
    target: ["es2018"],
    charset: "utf8",
    logLevel: "warning",
  }).outputFiles[0].text;

  // The extracted region is pure definitions — verified free of
  // Math.random/Date.now, and its one performance.now sits inside
  // createMeshGradient, which is never called here. Evaluating it is side-effect
  // free, which is what makes loading both implementations in one page safe.
  const harness = `<!doctype html><meta charset="utf-8"><body>
<script>
window.OLD = (function () {
  "use strict";
${region}
  return { createGenerator: createGenerator };
})();
</script>
<script>${bundle}</script>
<script>
// A fixed palette, so a palette-lookup difference can never be misread as a
// generator difference.
var PALETTE = ["#0b1a2a", "#1e5f8c", "#4fd1c5", "#f6e05e"];

window.drawBoth = function (key, params, frames, w, h) {
  function run(make) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const inst = make(key);
    const shots = [];
    for (const t of frames) {
      inst.draw(ctx, w, h, t, params, PALETTE);
      shots.push(ctx.getImageData(0, 0, w, h).data);
    }
    return shots;
  }
  const a = run(window.OLD.createGenerator);
  const b = run(window.BPH.createGenerator);
  const out = [];
  for (let i = 0; i < frames.length; i++) {
    const pa = a[i];
    const pb = b[i];
    // Quantified, not just flagged: one channel off by 1 on a handful of pixels
    // is a different finding from a generator drawing something else, and
    // reporting them identically would waste the next session's time.
    let diffPx = 0;
    let maxDelta = 0;
    for (let p = 0; p < pa.length; p += 4) {
      let d = 0;
      for (let ch = 0; ch < 4; ch++) {
        const delta = Math.abs(pa[p + ch] - pb[p + ch]);
        if (delta > d) d = delta;
      }
      if (d) {
        diffPx++;
        if (d > maxDelta) maxDelta = d;
      }
    }
    out.push({
      frame: frames[i],
      same: diffPx === 0,
      diffPx: diffPx,
      pct: +((diffPx / (w * h)) * 100).toFixed(3),
      maxDelta: maxDelta,
    });
  }
  return out;
};
</script></body>`;

  const harnessPath = path.join(REPO, ".parity-harness.html");
  fs.writeFileSync(harnessPath, harness, "utf8");

  const chrome = spawn(CHR, [
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    `--remote-debugging-port=${PORT}`,
    "--window-size=900,700",
    "about:blank",
  ]);
  chrome.stderr.on("data", () => {});

  const cleanup = () => {
    try {
      fs.unlinkSync(harnessPath);
    } catch {}
    chrome.kill();
  };

  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(250);
      try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        target = list.find((t) => t.type === "page");
      } catch {}
    }
    if (!target) throw new Error("could not reach CDP — is CHROMIUM_PATH right?");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    const errs = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
        errs.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
      if (m.method === "Runtime.exceptionThrown")
        errs.push(
          "EXCEPTION: " +
            (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
        );
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    };
    const send = (method, params = {}) =>
      new Promise((res) => {
        const i = ++id;
        pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    const ev = async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.result?.exceptionDetails)
        throw new Error(r.result.exceptionDetails.exception?.description || "evaluate failed");
      return r.result?.result?.value;
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: `file://${harnessPath}` });
    await sleep(1200);

    if (!(await ev("!!(window.OLD && window.BPH && window.drawBoth)"))) {
      console.error("harness failed to load both implementations:\n  " + errs.join("\n  "));
      process.exit(1);
    }

    const rows = [];
    let compared = 0;
    let identical = 0;

    for (const c1 of DATA.categories) {
      for (const c2 of c1.subcategories) {
        for (const t of c2.types) {
          if (!t.generator || !Array.isArray(t.sliders) || !t.sliders.length) continue;
          // Defaults exactly as the UI opens them, plus the tier's default
          // extent. Both implementations receive the identical params object, so
          // any pixel difference belongs to the generator, not to the caller.
          const params = {};
          for (const s of t.sliders) params[s.key] = s.default;
          const tierM = t.scaleTier && TIER_DEFAULT_M[t.scaleTier];
          if (tierM) params.canvasWidthM = tierM;

          const frames = JSON.parse(
            await ev(
              `JSON.stringify(window.drawBoth(${JSON.stringify(t.generator)}, ` +
                `${JSON.stringify(params)}, ${JSON.stringify(FRAMES)}, ${W}, ${H}))`
            )
          );
          compared++;
          const diffs = frames.filter((f) => !f.same);
          if (!diffs.length) identical++;
          else
            rows.push(
              `${t.slug || t.generator} (${t.generator}): ` +
                diffs
                  .map((d) => `t=${d.frame} ${d.diffPx}px (${d.pct}%) maxΔ${d.maxDelta}`)
                  .join("; ")
            );
        }
      }
    }

    console.log(`\nGENERATOR PARITY  lib/ (current) vs ${REF}:standalone.html`);
    console.log(`  types compared     ${compared}`);
    console.log(`  pixel-identical    ${identical}/${compared}   (${FRAMES.length} frames each)`);
    console.log(`  console errors     ${errs.length}`);
    if (rows.length) {
      console.log(`\n  DIFFERENCES (${rows.length}):`);
      for (const r of rows) console.log(`    ${r}`);
    } else {
      console.log("  → every generator draws the identical frame from both sources");
    }
    if (errs.length) {
      console.log("\n  ERRORS:");
      for (const e of errs.slice(0, 10)) console.log(`    ${e}`);
    }
    cleanup();
    process.exit(rows.length || errs.length ? 1 : 0);
  } catch (e) {
    cleanup();
    throw e;
  }
})();
