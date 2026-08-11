// Does the LIVE site actually carry the commits that were pushed?
//
// Asserts against the deployed DOM, not against the repo and not against an HTTP
// 200 — a 200 only proves a page exists, and Vercel will happily keep serving a
// stale build.
//
//   node scripts/check-production.js
//   BASE_URL=https://... node scripts/check-production.js
//
// Rewritten to share scripts/cdp.js. The previous version required("playwright")
// while playwright was not in package.json, so it died on MODULE_NOT_FOUND: the
// deployment audit had been broken since it was committed and nothing reported
// that, because nothing ran it. It also hardcoded an absolute path to one
// machine's home directory while its own commit message claimed it had none.
const path = require("path");
const { withChromium, readPlayground, clickTypeCard, TIERS } = require("./cdp");

const REPO = path.resolve(__dirname, "..");
const DATA = require(path.join(REPO, "lib/biomimicry-subcategories.json"));
const BASE = (process.env.BASE_URL || "https://biomimicry-pattern-hub.vercel.app").replace(/\/$/, "");

// CJK is only allowed in a unit when it IS the unit (點/m² is a density, 環 is the
// honest name for what geodesic-dome's frequency counts). A bare counter word
// restating the label is what 95ff0af removed.
const CJK_UNIT_OK = ["點/m²", "環"];

/**
 * One slider whose live values prove a specific commit shipped, rather than just
 * "the site is up". Point this at the newest change that altered a slider range.
 *
 * Currently geodesic-dome's memberThickness: B0 (04a064e) turned it from 1–3 px
 * into 100–300 mm, so a live min of 1 means the deploy predates B0. The whole
 * 145-slider comparison below would also catch that, but a named sentinel makes
 * "is my last push live?" answerable at a glance.
 */
const SENTINEL = { slug: "geodesic-dome", key: "memberThickness", expect: { min: 100, max: 300 } };

withChromium({ port: Number(process.env.CDP_PORT || 9343) }, async ({ ev, goto, errs }) => {
  const bad = [];
  const extentBad = [];
  const cjkLeaks = [];
  let typesOk = 0;
  let checked = 0;
  let infoOk = 0;
  let extentOk = 0;
  let paintedOk = 0;
  let sentinel = null;

  for (const cat of DATA.categories) {
    for (const sc of cat.subcategories) {
      const url = `${BASE}/category/${cat.category1_id}/${sc.category2_id}`;
      if (!(await goto(url, { wait: 2000 }))) {
        bad.push(`${sc.category2_id}: page never loaded`);
        continue;
      }

      for (const t of sc.types) {
        const clicked = await ev(clickTypeCard(t.name));
        if (clicked !== "ok") {
          bad.push(`${t.slug}: ${clicked}`);
          continue;
        }
        await new Promise((r) => setTimeout(r, 700));
        typesOk++;

        const dom = await readPlayground(ev);

        // The extent panel must appear exactly where a tier is declared.
        const tier = t.scaleTier ? TIERS[t.scaleTier] : null;
        if (t.scaleTier && !tier) extentBad.push(`${t.slug}: unknown tier "${t.scaleTier}"`);
        else if (tier && !dom.extent)
          extentBad.push(`${t.slug}: tier "${t.scaleTier}" but no extent slider`);
        else if (!tier && dom.extent) extentBad.push(`${t.slug}: no tier but extent slider present`);
        else if (tier) {
          const E = dom.extent;
          if (E.min !== tier.min || E.max !== tier.max || E.step !== tier.step)
            extentBad.push(
              `${t.slug}: extent ${E.min}-${E.max}/${E.step} vs tier ${tier.min}-${tier.max}/${tier.step}`
            );
          else if (E.value !== tier.defaultM)
            extentBad.push(`${t.slug}: extent opens at ${E.value}m, tier default ${tier.defaultM}m`);
          else extentOk++;
        }

        const wantDerive = t.sliders.filter((s) => s.derive).length;
        if (dom.derive.length !== wantDerive)
          extentBad.push(`${t.slug}: ${dom.derive.length} derive readouts, expected ${wantDerive}`);

        // Canvas actually painted. Line-art generators cover 1-2%, so this asserts
        // "something was drawn", never a coverage ratio (OPEN-ITEMS B3).
        if (dom.painted < 0) bad.push(`${t.slug}: no 2d canvas found`);
        else if (dom.painted === 0) bad.push(`${t.slug}: canvas painted nothing`);
        else paintedOk++;
        if (dom.cw && dom.cw < 300) bad.push(`${t.slug}: canvas collapsed to ${dom.cw}px`);

        if (dom.sliders.length !== t.sliders.length) {
          bad.push(`${t.slug}: ${dom.sliders.length} sliders live vs ${t.sliders.length} declared`);
          continue;
        }
        for (let i = 0; i < t.sliders.length; i++) {
          const d = t.sliders[i];
          const L = dom.sliders[i];
          checked++;
          if (L.min !== d.min) bad.push(`${t.slug}/${d.key}: min ${L.min} live vs ${d.min} repo`);
          if (L.max !== d.max) bad.push(`${t.slug}/${d.key}: max ${L.max} live vs ${d.max} repo`);
          if (L.step !== d.step) bad.push(`${t.slug}/${d.key}: step ${L.step} live vs ${d.step} repo`);
          if (t.slug === SENTINEL.slug && d.key === SENTINEL.key) sentinel = L;
          const u = (d.unit || "").trim();
          if (/[一-鿿]/.test(u) && !CJK_UNIT_OK.includes(u)) cjkLeaks.push(`${t.slug}/${d.key}="${u}"`);
        }

        if (dom.infoSections === 3) infoOk++;
        else bad.push(`${t.slug}: info panel sections=${dom.infoSections}/3`);
      }
    }
  }

  const sentinelLive =
    sentinel && sentinel.min === SENTINEL.expect.min && sentinel.max === SENTINEL.expect.max;

  console.log(`\nLIVE SITE  ${BASE}`);
  console.log(`  types reached      ${typesOk}/48`);
  console.log(`  sliders verified   ${checked}/145  (min/max/step vs repo)`);
  console.log(`  info panels        ${infoOk}/48`);
  console.log(`  canvases painting  ${paintedOk}/48`);
  console.log(`  extent sliders     ${extentOk}/44  (4 types have no tier by design)`);
  if (extentBad.length) {
    console.log(`  extent problems    ${extentBad.length}`);
    extentBad.slice(0, 10).forEach((x) => console.log("    " + x));
  }
  console.log(
    `  deploy sentinel    ${SENTINEL.slug}/${SENTINEL.key} = ${JSON.stringify(sentinel)}` +
      `  ${sentinelLive ? "<-- B0 (04a064e) is live" : "<-- STALE: expected min " + SENTINEL.expect.min}`
  );
  console.log(
    `  CJK unit leaks     ${cjkLeaks.length}${cjkLeaks.length ? " " + cjkLeaks.join(", ") : "  <-- 95ff0af live"}`
  );
  console.log(`  mismatches         ${bad.length}`);
  bad.slice(0, 12).forEach((x) => console.log("    " + x));
  console.log(`  console errors     ${errs.length}`);
  [...new Set(errs)].slice(0, 5).forEach((x) => console.log("    " + String(x).slice(0, 130)));

  // Returned, not process.exit'd: exiting inside the callback skips the driver's
  // cleanup, leaving a browser bound to the CDP port.
  return bad.length || extentBad.length || (sentinelLive ? 0 : 1);
})
  .then((problems) => process.exit(problems ? 1 : 0))
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  });
