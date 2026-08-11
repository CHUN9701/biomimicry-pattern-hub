// Build standalone.html from standalone.template.html + a bundle of lib/.
//
//   node scripts/build-standalone.mjs          # write standalone.html
//   node scripts/build-standalone.mjs --check  # verify it is up to date, write nothing
//
// The --check mode is for CI: it fails if standalone.html does not match what
// the current lib/ and template produce, which is exactly the "somebody hand-
// edited the generated file" case that used to cause drift between the builds.
//
// Not minified on purpose. standalone.html is handed to students as a single
// file they can open with no server and read if they want to; a minified blob
// would technically work but would make the artifact opaque and its diffs
// unreviewable. The cost is file size, which does not matter for local use.
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = path.join(REPO, "standalone.template.html");
const OUT = path.join(REPO, "standalone.html");
const ENTRY = path.join(REPO, "lib/standalone-runtime.ts");
const PLACEHOLDER = "<!--BPH_RUNTIME-->";

const checkOnly = process.argv.includes("--check");

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "BPH",
  // The standalone build runs from file:// in whatever browser the student has,
  // so it targets the same baseline the Next.js build does rather than assuming
  // a current engine.
  target: ["es2018"],
  charset: "utf8",
  legalComments: "none",
  logLevel: "warning",
});

const bundle = result.outputFiles[0].text;

const template = await readFile(TEMPLATE, "utf8");
if (!template.includes(PLACEHOLDER)) {
  throw new Error(`${path.basename(TEMPLATE)} is missing the ${PLACEHOLDER} placeholder`);
}

const banner = [
  "<!-- GENERATED FILE — do not edit.",
  "     Built by: node scripts/build-standalone.mjs",
  "     Sources:  standalone.template.html (UI shell) + lib/ via lib/standalone-runtime.ts",
  "     Edit those instead; this file is overwritten on every build. -->",
].join("\n");

const runtime = [
  "<script>",
  "/* Bundled from lib/standalone-runtime.ts — see the banner at the top of this file. */",
  bundle.trimEnd(),
  "</script>",
].join("\n");

const html = `${banner}\n${template.replace(PLACEHOLDER, runtime)}`;

// Prove the bundle actually exposes what the UI shell destructures, before
// shipping a file whose only symptom would be a ReferenceError at runtime in
// front of a student. Read the destructured names out of the template rather
// than restating them here, so this check cannot fall out of date.
const destructure = template.match(/const \{([\s\S]*?)\} = BPH;/);
if (!destructure) throw new Error("could not find the `= BPH;` destructuring in the template");
const wanted = destructure[1]
  .split(",")
  .map((s) => s.split(":")[0].trim())
  .filter(Boolean);
const exported = new Set(
  [...bundle.matchAll(/^\s*(\w+):\s*\(\)\s*=>/gm)].map((m) => m[1])
);
const missing = wanted.filter((n) => !exported.has(n));
if (missing.length) {
  throw new Error(
    `lib/standalone-runtime.ts does not export: ${missing.join(", ")}\n` +
      "The UI shell destructures these from window.BPH, so the build would " +
      "produce a file that throws on load."
  );
}

if (checkOnly) {
  const current = await readFile(OUT, "utf8").catch(() => null);
  if (current !== html) {
    console.error(
      "standalone.html is out of date.\n" +
        "Either lib/ or standalone.template.html changed without a rebuild, or " +
        "standalone.html was hand-edited (it is generated — edit the template).\n" +
        "Fix with: npm run build:standalone"
    );
    process.exit(1);
  }
  console.log(`standalone.html up to date (${wanted.length} runtime names, ${kb(html)})`);
} else {
  await writeFile(OUT, html, "utf8");
  console.log(
    `wrote standalone.html — ${kb(html)} ` +
      `(shell ${lines(template)} lines + runtime bundle ${kb(bundle)}, ${wanted.length} names verified)`
  );
}

function kb(s) {
  return `${Math.round(Buffer.byteLength(s, "utf8") / 1024)}KB`;
}
function lines(s) {
  return s.split("\n").length;
}
