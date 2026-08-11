// Walk all 48 types and check the physical-extent feature end to end:
// the extent panel appears exactly where a tier is declared, its range matches
// the tier, every derived slider resolves a readout, the canvas actually paints,
// and the console stays clean.
//
//   node scripts/check-scale.js                       # standalone.html, offline
//   BASE_URL=http://localhost:3000 node scripts/check-scale.js
//
// CHROMIUM_PATH overrides the browser binary. The Chromium plumbing, the
// canvas-picking rules and the tier restatement live in scripts/cdp.js, shared
// with check-production.js — see the note at the top of that file for why they are
// not copied per script.
const path = require("path");
const { withChromium, readPlayground, clickTypeCard, TIERS, sleep } = require("./cdp");

const REPO = path.resolve(__dirname, "..");
const DATA = require(path.join(REPO, "lib/biomimicry-subcategories.json"));
const BASE = process.env.BASE_URL || `file://${path.join(REPO, "standalone.html")}`;
const OFFLINE = BASE.startsWith("file://");

withChromium({ port: Number(process.env.CDP_PORT || 9339) }, async ({ ev, goto, errs }) => {
  const bad = [];
  let reached = 0;
  let extentOk = 0;
  let noTierOk = 0;
  let deriveOk = 0;

  for (const c1 of DATA.categories) {
    for (const c2 of c1.subcategories) {
      const url = OFFLINE
        ? `${BASE}#/category/${c1.category1_id}/${c2.category2_id}`
        : `${BASE}/category/${c1.category1_id}/${c2.category2_id}`;
      // A hash route won't re-render if the hash is already what we're setting,
      // so bounce through the root first.
      if (OFFLINE) {
        await ev('location.hash = ""');
        await sleep(120);
      }
      if (!(await goto(url, { wait: OFFLINE ? 1400 : 2000 }))) {
        bad.push(`${c2.category2_id}: page never loaded`);
        continue;
      }

      for (const t of c2.types) {
        const clicked = await ev(clickTypeCard(t.name));
        if (clicked !== "ok") {
          bad.push(`${t.slug}: ${clicked}`);
          continue;
        }
        await sleep(900);
        reached++;

        const state = await readPlayground(ev);

        const tier = t.scaleTier ? TIERS[t.scaleTier] : null;
        if (t.scaleTier && !tier) bad.push(`${t.slug}: unknown tier "${t.scaleTier}"`);
        else if (tier && !state.extent)
          bad.push(`${t.slug}: tier "${t.scaleTier}" but no extent slider`);
        else if (!tier && state.extent) bad.push(`${t.slug}: no tier but an extent slider is shown`);
        else if (tier) {
          const E = state.extent;
          if (E.min !== tier.min || E.max !== tier.max || E.step !== tier.step)
            bad.push(
              `${t.slug}: extent ${E.min}-${E.max}/${E.step} vs tier ${tier.min}-${tier.max}/${tier.step}`
            );
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
        console.log(
          `  ${t.slug.padEnd(30)} ${(state.extent ? state.extent.value + "m" : "—").padEnd(7)}${line}`
        );
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

  // Return rather than process.exit here: exiting inside the callback skips
  // withChromium's cleanup entirely, which is what leaked browsers and left the
  // CDP port bound for the next run.
  return bad.length;
})
  .then((problems) => process.exit(problems ? 1 : 0))
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  });
