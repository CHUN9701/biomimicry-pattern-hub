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

        const live = await page.evaluate(() =>
          [...document.querySelectorAll('input[type="range"]')].map(el => ({
            min: el.min, max: el.max, step: el.step,
            text: (el.closest("div")?.parentElement?.textContent || "").trim(),
          }))
        );
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
          if (/[一-鿿]/.test(u) && d.key !== "frequency") cjkLeaks.push(`${t.slug}/${d.key}="${u}"`);
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
  console.log(`  snapSharpness DOM  ${JSON.stringify(snap)}   <-- must be min 35 for commit 30d573a to be live`);
  console.log(`  CJK unit leaks     ${cjkLeaks.length}${cjkLeaks.length ? " " + cjkLeaks.join(", ") : "  <-- commit 95ff0af live"}`);
  console.log(`  mismatches         ${bad.length}`);
  bad.slice(0, 12).forEach(x => console.log("    " + x));
  console.log(`  console errors     ${errs.length}`);
  [...new Set(errs)].slice(0, 5).forEach(x => console.log("    " + x.slice(0, 130)));
  await b.close();
})();
