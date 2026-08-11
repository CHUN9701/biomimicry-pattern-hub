// Shared Chromium driver for the browser-based audits.
//
// One copy, because the alternative is what this project spent 5,024 lines
// learning about (docs/STANDALONE-BUILD.md): three scripts each carrying their
// own launch/connect/evaluate plumbing drift apart, and the one that drifts is
// the one nobody runs until it is needed.
//
// No Playwright dependency on purpose. check-production.js used to require it
// while it was not in package.json, so the script that verifies the deployed site
// failed on `Cannot find module 'playwright'` — the deployment audit was dead and
// nothing said so. This drives the cached Chromium directly over CDP using Node's
// global WebSocket, which is also robust to Playwright's browser cache being
// broken by macOS temp cleanup (docs/OPEN-ITEMS.md §05).
const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const DEFAULT_CHROMIUM =
  "/Users/chun/Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Launch headless Chromium, hand a session to `body`, and always clean up.
 *
 * The session exposes:
 *   ev(expression)   evaluate in the page, returned by value
 *   goto(url)        navigate and wait for the page to settle
 *   errs             console errors and uncaught exceptions, accumulated
 */
async function withChromium(opts, body) {
  const {
    port = Number(process.env.CDP_PORT || 9339),
    windowSize = "1400,1100",
    chromiumPath = process.env.CHROMIUM_PATH || DEFAULT_CHROMIUM,
    settle = 900,
  } = opts || {};

  // Refuse to run if something is already on this port.
  //
  // Without this the run silently ATTACHES to whatever browser is already there
  // and drives its first page target — which is how a whole audit went wrong
  // once: leftover browsers from earlier runs held the port, the first page
  // target was a background page, and background pages have requestAnimationFrame
  // throttled. Slider and text reads kept working (static DOM), while every
  // canvas read came back blank, so all 48 types were reported as "canvas painted
  // nothing" with 0 console errors. A false failure that looks like a product bug
  // costs far more than an explicit refusal.
  if (await portResponds(port)) {
    throw new Error(
      `a browser is already listening on CDP port ${port}.\n` +
        `  Attaching to it would silently drive the wrong page, so this refuses to start.\n` +
        `  Fix: pkill -9 -f ms-playwright/chromium   (or set CDP_PORT to a free port)`
    );
  }

  // A private profile per launch, so concurrent runs never contend over one
  // user-data-dir.
  const userDataDir = path.join(
    os.tmpdir(),
    `bph-cdp-${port}-${process.pid}-${process.hrtime.bigint()}`
  );

  const chrome = spawn(
    chromiumPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${windowSize}`,
      "about:blank",
    ],
    // Its own process group, so cleanup can kill the whole tree. Killing just the
    // launcher leaves the browser and its renderers running — which is how this
    // leaked 36 processes and then attached to its own leftovers.
    { detached: true, stdio: ["ignore", "ignore", "pipe"] }
  );
  chrome.stderr.on("data", () => {});
  chrome.on("error", (e) => {
    throw new Error(`could not start Chromium at ${chromiumPath}: ${e.message}`);
  });

  let ws = null;
  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(250);
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = list.find((t) => t.type === "page");
      } catch {}
    }
    if (!target) {
      throw new Error(
        `could not reach CDP on port ${port}. Is CHROMIUM_PATH right?\n  tried: ${chromiumPath}`
      );
    }

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error("CDP websocket failed to open"));
    });

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
      new Promise((resolve) => {
        const i = ++id;
        pending.set(i, resolve);
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

    /**
     * Navigate, with retries. A single cold page load over the public network can
     * exceed any fixed wait, and failing a 48-type audit because one request was
     * slow produces a red run that means nothing.
     */
    const goto = async (url, { retries = 3, wait = settle } = {}) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await send("Page.navigate", { url });
          await sleep(wait);
          const ready = await ev("document.readyState");
          if (ready === "complete" || ready === "interactive") return true;
        } catch {}
        if (attempt < retries) await sleep(600);
      }
      return false;
    };

    return await body({ ev, send, goto, errs, sleep });
  } finally {
    // Shut the browser down for real, then PROVE the port let go.
    //
    // Two things were wrong the first time this was written, and both were only
    // visible by measuring afterwards rather than by reading the code:
    //   - Browser.close was sent on the PAGE session, which does not accept it.
    //     It has to go to the browser-level endpoint from /json/version.
    //   - chrome.kill() killed the launcher and left the browser and renderers
    //     running, so the port stayed bound.
    try {
      ws?.close();
    } catch {}
    await closeBrowser(port);
    try {
      // Negative pid = the whole process group (spawned detached above).
      process.kill(-chrome.pid, "SIGKILL");
    } catch {
      try {
        chrome.kill("SIGKILL");
      } catch {}
    }
    let freed = false;
    for (let i = 0; i < 15 && !freed; i++) {
      freed = !(await portResponds(port));
      if (!freed) await sleep(200);
    }
    if (!freed) {
      console.error(
        `WARNING: CDP port ${port} is still bound after cleanup. A leftover browser ` +
          `will make the NEXT run refuse to start (by design). Clear it with:\n` +
          `  pkill -9 -f ms-playwright/chromium`
      );
    }
    fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Ask the browser to close, over the browser-level endpoint.
 *
 * Browser.close is not accepted on a page session — sending it there is silently
 * ignored, which is why the first version of this cleanup appeared to work while
 * leaving the browser bound to the port.
 */
async function closeBrowser(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(1200),
    });
    const url = (await r.json()).webSocketDebuggerUrl;
    if (!url) return;
    const bws = new WebSocket(url);
    await new Promise((resolve) => {
      bws.onopen = resolve;
      bws.onerror = resolve;
      setTimeout(resolve, 800);
    });
    if (bws.readyState === 1) {
      bws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
      await sleep(400);
    }
    try {
      bws.close();
    } catch {}
  } catch {}
}

/** Is a CDP endpoint answering on this port? */
async function portResponds(port) {
  try {
    const ctl = AbortSignal.timeout(1200);
    const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: ctl });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Read the state of the playground from a loaded page.
 *
 * Kept here rather than in each script because two of the canvas-picking rules
 * were learned the hard way and must not be re-derived per script:
 *
 *  - The page's biggest canvas is the WebGL background. Normally getContext('2d')
 *    returns null on it, but in headless with --disable-gpu its WebGL context
 *    fails to initialise, so 2d succeeds and returns a blank canvas — which once
 *    reported all 48 types as painting nothing. So every candidate is scored and
 *    the most-painted one wins.
 *  - The extent slider is not one of a type's declared sliders (it comes from
 *    scaleTier and sits below the canvas), so it is pulled out by aria-label
 *    before the parameter panel is compared position by position.
 */
const READ_PLAYGROUND = `(() => {
  const all = [...document.querySelectorAll('input[type=range]')];
  const read = el => ({ min: +el.min, max: +el.max, step: +el.step, value: +el.value });
  const extentEl = all.find(el => el.getAttribute('aria-label') === '畫布實體寬度');

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
    sliders: all.filter(el => el !== extentEl).map(read),
    sliderCount: all.length - (extentEl ? 1 : 0),
    derive: [...document.querySelectorAll('p')]
      .map(p => p.textContent.trim()).filter(x => x.startsWith('→')),
    infoSections: ['這是什麼', '生成原理', '空間設計運用']
      .filter(h => document.body.innerText.includes(h)).length,
    painted, cw, ch,
  };
})()`;

/**
 * Read the playground, re-reading if the canvas came back blank.
 *
 * Switching type remounts the canvas, and there is a frame where it is cleared
 * before the new generator's first draw lands. A single read that falls in that
 * window reports "canvas painted nothing" for a canvas that is fine — which it
 * did for deep-well-shadow on the live site, while the same page at the same wait
 * painted 10,326 sampled pixels when read again.
 *
 * A genuinely blank canvas stays blank, so retrying costs nothing but removes a
 * false failure. Only `painted` is retried: it is the one field with a transient.
 */
async function readPlayground(ev, { retries = 3, gap = 450 } = {}) {
  let dom = await ev(READ_PLAYGROUND);
  for (let i = 1; i < retries && dom.painted === 0; i++) {
    await sleep(gap);
    dom = await ev(READ_PLAYGROUND);
  }
  return dom;
}

/** Click a type card BY NAME. Clicking by index picks the wrong card and has
 *  produced 88 phantom slider mismatches before. */
const clickTypeCard = (name) => `(() => {
  const cards = [...document.querySelectorAll('button')].filter(b => b.querySelector('canvas'));
  const card = cards.find(c => c.textContent.includes(${JSON.stringify(name)}));
  if (!card) return 'card not found';
  card.click();
  return 'ok';
})()`;

/**
 * The four physical-extent tiers, restated rather than imported from
 * lib/scale.ts. Importing the source of truth would let a wrong tier pass by
 * agreeing with itself; an audit has to compare against an independent statement
 * of what the values should be.
 */
const TIERS = {
  material: { defaultM: 0.6, min: 0.15, max: 1.2, step: 0.05 },
  component: { defaultM: 2, min: 0.5, max: 5, step: 0.1 },
  space: { defaultM: 8, min: 2, max: 20, step: 0.5 },
  mass: { defaultM: 40, min: 10, max: 120, step: 1 },
};

module.exports = { withChromium, READ_PLAYGROUND, readPlayground, clickTypeCard, TIERS, sleep };
