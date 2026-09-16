/**
 * Renames the exported icons to carry a hash of their own contents, and points
 * index.html and the manifest at the new names.
 *
 * Why: a browser caches a favicon far more stubbornly than a page, and often
 * ignores Cache-Control for it entirely. An installed PWA keeps the icon it was
 * installed with. So changing the artwork behind a fixed URL like /icon-192.png
 * leaves people staring at the old logo for days, and the only advice is "clear
 * your cache", which is not advice a parent should need.
 *
 * A content hash in the filename removes the question: new artwork is a new URL
 * that nothing has ever cached. It is exactly what Metro already does for the JS
 * bundle — this brings the icons up to the same standard.
 *
 * The originals stay in place as well, because iOS probes /apple-touch-icon.png
 * by convention when no tag matches, and a bare /favicon.ico is still requested
 * by some crawlers.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

/** Everything referenced from the head or the manifest. */
const ICONS = [
  "favicon.ico",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "og.png",
];

const shortHash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);

/** "icon-192.png" + "a1b2c3d4" -> "icon-192.a1b2c3d4.png" */
function stamp(name, hash) {
  const dot = name.lastIndexOf(".");
  return `${name.slice(0, dot)}.${hash}${name.slice(dot)}`;
}

const renamed = new Map();

for (const name of ICONS) {
  const src = join(DIST, name);
  if (!existsSync(src)) {
    console.warn(`fingerprint-icons: ${name} is not in the export — skipped.`);
    continue;
  }
  const hashed = stamp(name, shortHash(readFileSync(src)));
  copyFileSync(src, join(DIST, hashed));
  renamed.set(name, hashed);
}

if (!renamed.size) {
  console.error("fingerprint-icons: found no icons to stamp — did the export run?");
  process.exit(1);
}

/** Rewrites every "/name" reference, longest first so no name is a prefix of another. */
function rewrite(text) {
  let out = text;
  for (const [name, hashed] of [...renamed].sort((a, b) => b[0].length - a[0].length)) {
    out = out.split(`/${name}`).join(`/${hashed}`);
  }
  return out;
}

for (const file of ["index.html", "manifest.json"]) {
  const path = join(DIST, file);
  if (!existsSync(path)) continue;
  writeFileSync(path, rewrite(readFileSync(path, "utf8")));
}

console.log("fingerprint-icons: stamped " + renamed.size + " icons");
for (const [name, hashed] of renamed) console.log("  " + name + "  →  " + hashed);
