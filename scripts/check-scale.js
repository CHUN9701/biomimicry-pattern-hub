// Walk all 48 types and check the physical-extent feature end to end:
// the extent panel appears exactly where a tier is declared, its range matches
// the tier, every derived slider resolves a readout, the canvas actually paints,
// and the console stays clean.
//
// Deliberately dependency-free: it drives the cached Chromium over CDP with
// Node's global WebSocket, so it runs whether or not Playwright is installed
// (Playwright's browser cache has been broken by macOS temp cleanup before —
// see docs/OPEN-ITEMS.md §05).
//
//   node scripts/check-scale.js                       # standalone.html, offline
//   BASE_URL=http://localhost:3000 node scripts/check-scale.js
//
// CHROMIUM_PATH overrides the browser binary.
const { spawn } = require("child_process");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const DATA = require(path.join(REPO, "lib/biomimicry-subcategories.json"));
const CHR =
  process.env.CHROMIUM_PATH ||
  "/Users/chun/Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium";
const BASE = process.env.BASE_URL || `file://${path.join(REPO, "standalone.html")}`;
const PORT = Number(process.env.CDP_PORT || 9339);

// Independent statement of the tiers — see the same note in check-production.js:
// importing lib/scale.ts would let a wrong tier pass by agreeing with itself.
const TIERS = {
  material: { defaultM: 0.6, min: 0.15, max: 1.2, step: 0.05 },
  component: { defaultM: 2, min: 0.5, max: 5, step: 0.1 },
  space: { defaultM: 8, min: 2, max: 20, step: 0.5 },
  mass: { defaultM: 40, min: 10, max: 120, step: 1 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHR, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    `--remote-debugging-port=${PORT}`,
    "--window-size=1400,1100",
    "about:blank",
  ]);
  chrome.stderr.on("data", () => {});

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
      errs.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails)
      throw new Error(r.result.exceptionDetails.exception?.description || "evaluate failed");
    return r.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  const bad = [];
  let reached = 0, extentOk = 0, noTierOk = 0, deriveOk = 0;

  for (const c1 of DATA.categories) {
    for (const c2 of c1.subcategories) {
      const url = BASE.startsWith("file://")
        ? `${BASE}#/category/${c1.category1_id}/${c2.category2_id}`
        : `${BASE}/category/${c1.category1_id}/${c2.category2_id}`;
      // A hash route won't re-render if the hash is already what we're setting,
      // so bounce through the root first.
      if (BASE.startsWith("file://")) { await ev('location.hash = ""'); await sleep(120); }
      await send("Page.navigate", { url });
      await sleep(BASE.startsWith("file://") ? 1400 : 2000);

      for (const t of c2.types) {
        // Click the card BY NAME. Clicking by index picks the wrong card and has
        // produced 88 phantom slider mismatches before.
        const clicked = await ev(`(() => {
          const cards = [...document.querySelectorAll('button')].filter(b => b.querySelector('canvas'));
          const card = cards.find(c => c.textContent.includes(${JSON.stringify(t.name)}));
          if (!card) return 'card not found';
          card.click();
          return 'ok';
        })()`);
        if (clicked !== "ok") { bad.push(`${t.slug}: ${clicked}`); continue; }
        await sleep(900);
        reached++;

        const state = await ev(`(() => {
          const all = [...document.querySelectorAll('input[type=range]')];
          const extentEl = all.find(el => el.getAttribute('aria-label') === '畫布實體寬度');
          const read = el => ({ min: +el.min, max: +el.max, step: +el.step, value: +el.value });
          // Canvas picking is where this check has been wrong twice. The page's
          // biggest canvas is the WebGL background: normally getContext('2d')
          // returns null on it and it can be skipped — but in headless with
          // --disable-gpu its WebGL context fails to initialise, so 2d succeeds
          // and hands back a blank canvas. Taking the FIRST 2d-capable canvas
          // therefore reported all 48 types as painting nothing. So score every
          // candidate and keep the most-painted one.
          const canvases = [...document.querySelectorAll('canvas')];
          let painted = -1, cw = 0, ch = 0;
          for (const c of canvases) {
            if (c.width < 250) continue;
            const ctx = c.getContext('2d');
            if (!ctx) continue;
            const d = ctx.getImageData(0, 0, c.width, c.height).data;
            let hits = 0;
            for (let i = 3; i < d.length; i += 4 * 37) if (d[i] > 8) hits++;
            if (hits > painted) { painted = hits; cw = c.width; ch = c.height; }
          }
          return {
            extent: extentEl ? read(extentEl) : null,
            sliderCount: all.length - (extentEl ? 1 : 0),
            derive: [...document.querySelectorAll('p')]
              .map(p => p.textContent.trim()).filter(x => x.startsWith('→')),
            painted, cw, ch,
          };
        })()`);

        const tier = t.scaleTier ? TIERS[t.scaleTier] : null;
        if (t.scaleTier && !tier) bad.push(`${t.slug}: unknown tier "${t.scaleTier}"`);
        else if (tier && !state.extent) bad.push(`${t.slug}: tier "${t.scaleTier}" but no extent slider`);
        else if (!tier && state.extent) bad.push(`${t.slug}: no tier but an extent slider is shown`);
        else if (tier) {
          const E = state.extent;
          if (E.min !== tier.min || E.max !== tier.max || E.step !== tier.step)
            bad.push(`${t.slug}: extent ${E.min}-${E.max}/${E.step} vs tier ${tier.min}-${tier.max}/${tier.step}`);
          else if (E.value !== tier.defaultM)
            bad.push(`${t.slug}: extent opens at ${E.value}m, tier default ${tier.defaultM}m`);
          else extentOk++;
        } else noTierOk++;

        if (state.sliderCount !== t.sliders.length)
          bad.push(`${t.slug}: ${state.sliderCount} parameter sliders vs ${t.sliders.length} declared`);

        const wantDerive = t.sliders.filter((s) => s.derive).length;
        if (state.derive.length !== wantDerive)
          bad.push(`${t.slug}: ${state.derive.length} derive readouts, expected ${wantDerive}`);
        else deriveOk += wantDerive;

        if (state.painted < 0) bad.push(`${t.slug}: no 2d canvas found`);
        // Line-art generators paint only 1-2% of the canvas, so this asserts
        // "something was drawn", never a coverage ratio.
        else if (state.painted === 0) bad.push(`${t.slug}: canvas painted nothing`);
        if (state.cw && state.cw < 300) bad.push(`${t.slug}: canvas collapsed to ${state.cw}px`);

        const line = state.derive[0] ? "  " + state.derive[0].slice(0, 56) : "";
        console.log(`  ${t.slug.padEnd(30)} ${(state.extent ? state.extent.value + "m" : "—").padEnd(7)}${line}`);
      }
    }
  }

  console.log(`\nTARGET  ${BASE}`);
  console.log(`  types reached        ${reached}/48`);
  console.log(`  extent sliders       ${extentOk}/44  (tier range + opening value)`);
  console.log(`  types with no tier   ${noTierOk}/4   (Gray-Scott family, by design)`);
  console.log(`  derive readouts      ${deriveOk}/15`);
  console.log(`  console errors       ${errs.length}`);
  [...new Set(errs)].slice(0, 5).forEach((e) => console.log("    " + String(e).slice(0, 130)));
  console.log(`  problems             ${bad.length}`);
  bad.slice(0, 15).forEach((x) => console.log("    " + x));

  ws.close();
  chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
