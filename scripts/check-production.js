// Does the LIVE site actually carry the commits I pushed? Auto-deploy from
// GitHub has never been verified from my side, so this asserts against the
// deployed DOM, not against the repo.
const { chromium } = require("playwright");
// Normally leave this unset and let Playwright use its own browser. Set
// CHROMIUM_PATH only to work around a broken/mismatched local browser cache.
const EXE = process.env.CHROMIUM_PATH || undefined;
const DATA = require("/Users/chun/Desktop/專案/biomimicry/biomimicry-pattern-hub/lib/biomimicry-subcategories.json");
const BASE = process.env.BASE_URL || "https://biomimicry-pattern-hub.vercel.app";

(async () => {
  const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const page = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [], bad = [];
  page.on("console", m => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", e => errs.push(String(e)));

  let checked = 0, typesOk = 0, infoOk = 0, snap = null, cjkLeaks = [];
  let extentOk = 0, extentBad = [];

  // The four physical-extent tiers (lib/scale.ts). Duplicated here on purpose:
  // this script's job is to check the deployed DOM against an independent
  // statement of what it should be, so importing the source of truth would let
  // a wrong tier pass by agreeing with itself.
  const TIERS = {
    material:  { defaultM: 0.6, min: 0.15, max: 1.2,  step: 0.05 },
    component: { defaultM: 2,   min: 0.5,  max: 5,    step: 0.1 },
    space:     { defaultM: 8,   min: 2,    max: 20,   step: 0.5 },
    mass:      { defaultM: 40,  min: 10,   max: 120,  step: 1 },
  };
  // CJK is only allowed in a unit when it IS the unit (點/m² is a density,
  // 環 is the honest name for what geodesic-dome's frequency counts) — a bare
  // counter word restating the label is what commit 95ff0af removed.
  const CJK_UNIT_OK = [" 點/m²", " 環"];

  for (const cat of DATA.categories) {
    for (const sc of cat.subcategories) {
      // A single cold page can exceed the default timeout over the public
      // network; retry rather than failing the whole audit on one slow load.
      const url = `${BASE}/category/${cat.category1_id}/${sc.category2_id}`;
      let loaded = false;
      for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
        try { await page.goto(url, { waitUntil: "load", timeout: 45000 }); loaded = true; }
        catch (e) { if (attempt === 3) bad.push(`${sc.category2_id}: page never loaded — ${e.message.split("\n")[0]}`); }
      }
      if (!loaded) continue;
      await page.waitForTimeout(900);
      for (const t of sc.types) {
        const btn = page.locator(`button:has-text("${t.name}")`).first();
        if (await btn.count() === 0) { bad.push(`${t.slug}: card missing`); continue; }
        await btn.click();
        await page.waitForTimeout(420);
        typesOk++;

        // The extent slider is NOT one of the type's declared sliders — it comes
        // from `scaleTier` and lives below the canvas — so pull it out before
        // comparing the parameter panel position by position.
        const dom = await page.evaluate(() => {
          const all = [...document.querySelectorAll('input[type="range"]')];
          const read = el => ({ min: el.min, max: el.max, step: el.step, value: el.value });
          const extentEl = all.find(el => el.getAttribute("aria-label") === "畫布實體寬度");
          return {
            extent: extentEl ? read(extentEl) : null,
            sliders: all.filter(el => el !== extentEl).map(read),
            deriveLines: [...document.querySelectorAll("p")]
              .map(p => p.textContent.trim()).filter(x => x.startsWith("→")),
          };
        });
        const live = dom.sliders;

        // extent panel must appear exactly where a tier is declared
        const tier = t.scaleTier ? TIERS[t.scaleTier] : null;
        if (t.scaleTier && !tier) extentBad.push(`${t.slug}: unknown tier "${t.scaleTier}"`);
        else if (tier && !dom.extent) extentBad.push(`${t.slug}: tier "${t.scaleTier}" but no extent slider`);
        else if (!tier && dom.extent) extentBad.push(`${t.slug}: no tier but extent slider present`);
        else if (tier && dom.extent) {
          const E = dom.extent;
          if (Number(E.min) !== tier.min || Number(E.max) !== tier.max || Number(E.step) !== tier.step)
            extentBad.push(`${t.slug}: extent range ${E.min}-${E.max}/${E.step} vs tier ${tier.min}-${tier.max}/${tier.step}`);
          else if (Number(E.value) !== tier.defaultM)
            extentBad.push(`${t.slug}: extent opens at ${E.value}m, tier default is ${tier.defaultM}m`);
          else extentOk++;
        }
        // one readout per derived slider, and it must actually have resolved
        const wantDerive = t.sliders.filter(s => s.derive).length;
        if (dom.deriveLines.length !== wantDerive)
          extentBad.push(`${t.slug}: ${dom.deriveLines.length} derive readouts, expected ${wantDerive}`);
        if (live.length !== t.sliders.length) { bad.push(`${t.slug}: ${live.length} sliders on page vs ${t.sliders.length} declared`); continue; }
        for (let i = 0; i < t.sliders.length; i++) {
          const d = t.sliders[i], L = live[i];
          checked++;
          if (Number(L.min) !== d.min) bad.push(`${t.slug}/${d.key}: min ${L.min} live vs ${d.min} repo`);
          if (Number(L.max) !== d.max) bad.push(`${t.slug}/${d.key}: max ${L.max} live vs ${d.max} repo`);
          if (Number(L.step) !== d.step) bad.push(`${t.slug}/${d.key}: step ${L.step} live vs ${d.step} repo`);
          if (d.key === "snapSharpness") snap = L;
          // commit 95ff0af: no CJK counter word may survive as a unit
          const u = d.unit || "";
          if (/[一-鿿]/.test(u) && !CJK_UNIT_OK.includes(u)) cjkLeaks.push(`${t.slug}/${d.key}="${u}"`);
        }
        // commit series: every type must carry its info panel
        const info = await page.evaluate(() => {
          const txt = document.body.innerText;
          return ["這是什麼", "生成原理", "空間設計運用"].filter(h => txt.includes(h)).length;
        });
        if (info === 3) infoOk++; else bad.push(`${t.slug}: info panel sections=${info}/3`);
      }
    }
  }

  console.log(`\nLIVE SITE  ${BASE}`);
  console.log(`  types reached      ${typesOk}/48`);
  console.log(`  sliders verified   ${checked}/145  (min/max/step vs repo)`);
  console.log(`  info panels        ${infoOk}/48`);
  console.log(`  extent sliders     ${extentOk}/44  (tier range + opening value; 4 types have no tier by design)`);
  if (extentBad.length) { console.log(`  extent problems    ${extentBad.length}`); extentBad.slice(0, 10).forEach(x => console.log("    " + x)); }
  console.log(`  snapSharpness DOM  ${JSON.stringify(snap)}   <-- must be min 35 for commit 30d573a to be live`);
  console.log(`  CJK unit leaks     ${cjkLeaks.length}${cjkLeaks.length ? " " + cjkLeaks.join(", ") : "  <-- commit 95ff0af live"}`);
  console.log(`  mismatches         ${bad.length}`);
  bad.slice(0, 12).forEach(x => console.log("    " + x));
  console.log(`  console errors     ${errs.length}`);
  [...new Set(errs)].slice(0, 5).forEach(x => console.log("    " + x.slice(0, 130)));
  await b.close();
})();
