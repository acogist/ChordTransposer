#!/usr/bin/env node
// Adds libraries loaded from a CDN (jsDelivr / unpkg) in public/ to
// public/chordtransposer/THIRD_PARTY_LICENSES.md.
//
// - Scans public/**/*.{html,js,mjs} for https://cdn.jsdelivr.net/npm/<pkg>
//   and https://unpkg.com/<pkg> URLs.
// - A library counts as listed when the md has a "- Package: <pkg>" line.
// - For each library that is not listed yet, it reads the npm metadata and
//   the LICENSE file in the package tarball (both from registry.npmjs.org)
//   and adds an entry above the marker line.
// - Listed libraries that are no longer referenced are only reported, so
//   hand-written entries are never removed automatically.
//
// Usage: node scripts/update-third-party-licenses.mjs [--check]
//   --check  do not write; exit 1 if the md would change.
// Requires Node.js 18+ (global fetch).

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIR = join(ROOT, "public");
const MD = join(ROOT, "public/chordtransposer/THIRD_PARTY_LICENSES.md");
const MARKER = "<!-- New libraries are added above this line by scripts/update-third-party-licenses.mjs -->";
const CHECK = process.argv.includes("--check");

const PKG = String.raw`((?:@[\w.-]+\/)?[\w.-]+)(?:@([^\/"'\s\x60?#)]+))?`;
const CDN_PATTERNS = [
  new RegExp(String.raw`https?:\/\/cdn\.jsdelivr\.net\/npm\/` + PKG, "g"),
  new RegExp(String.raw`https?:\/\/unpkg\.com\/` + PKG, "g"),
];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(html|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

async function findCdnPackages() {
  const found = new Map(); // name -> { spec, files }
  for (const file of await walk(SCAN_DIR)) {
    const text = await readFile(file, "utf8");
    for (const re of CDN_PATTERNS) {
      for (const m of text.matchAll(re)) {
        const [, name, spec = "latest"] = m;
        const entry = found.get(name) || { spec, files: new Set() };
        entry.files.add(relative(ROOT, file));
        found.set(name, entry);
      }
    }
  }
  return found;
}

function listedPackages(md) {
  const listed = new Map(); // name -> indirect?
  for (const m of md.matchAll(/^- Package: (.+)$/gm)) {
    const indirect = /\(loaded by /.test(m[1]);
    for (const name of m[1].replace(/\(.*?\)/g, "").split(",")) {
      if (name.trim()) listed.set(name.trim(), indirect);
    }
  }
  return listed;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

// Picks the version a CDN would serve for a spec such as "5", "5.1", "^5.1.0", "3.11.174" or "latest".
function resolveVersion(packument, spec) {
  if (packument.versions[spec]) return spec;
  if (packument["dist-tags"][spec]) return packument["dist-tags"][spec];
  const caret = spec.startsWith("^");
  const base = spec.replace(/^[\^~=v]+/, "").replace(/\.[x*]$/i, "");
  const prefix = (caret ? base.split(".")[0] : base) + ".";
  const num = (v) => v.split(".").map(Number);
  const candidates = Object.keys(packument.versions)
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && (v + ".").startsWith(prefix))
    .sort((a, b) => num(b)[0] - num(a)[0] || num(b)[1] - num(a)[1] || num(b)[2] - num(a)[2]);
  return candidates[0];
}

// Returns the text of LICENSE / LICENCE / COPYING at the top of the package tarball.
async function licenseFromTarball(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const tar = gunzipSync(Buffer.from(await res.arrayBuffer()));
  for (let off = 0; off + 512 <= tar.length; ) {
    const name = tar.toString("utf8", off, off + 100).replace(/\0.*$/s, "");
    if (!name) break;
    const size = parseInt(tar.toString("utf8", off + 124, off + 136).replace(/\0.*$/s, "").trim() || "0", 8);
    if (/^[^/]+\/(licen[cs]e|copying)([.-][\w.-]+)?$/i.test(name)) {
      return tar.toString("utf8", off + 512, off + 512 + size);
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return "";
}

function repoUrl(meta) {
  let url = typeof meta.repository === "string" ? meta.repository : meta.repository?.url;
  if (!url) return meta.homepage || `https://www.npmjs.com/package/${meta.name}`;
  if (/^github:|^[\w.-]+\/[\w.-]+$/.test(url)) url = "https://github.com/" + url.replace(/^github:/, "");
  return url.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/^ssh:\/\/git@/, "https://").replace(/\.git$/, "");
}

async function buildEntry(name, spec) {
  const packument = await getJson(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
  const version = resolveVersion(packument, spec);
  if (!version) throw new Error(`${name}@${spec}: version could not be resolved`);
  const meta = packument.versions[version];
  const license = typeof meta.license === "string" ? meta.license : meta.license?.type || "See the package";
  const isApache = /^Apache-2\.0$/i.test(license);

  let licenseText = "";
  try {
    licenseText = (await licenseFromTarball(meta.dist.tarball)).trim();
  } catch (e) {
    console.warn(`  ! ${name}: could not read the LICENSE file (${e.message})`);
  }

  const copyright = (licenseText.match(/^\s*Copyright\b.*$/im) || [""])[0].trim();
  const lines = [
    `### ${name}`,
    `- Package: ${name}`,
    `- Purpose: ${meta.description || "(describe what it is used for)"}`,
    `- License: ${license}${isApache ? " (full text in section 3)" : ""}`,
  ];
  if (copyright) lines.push(`- ${copyright.replace(/^Copyright\s*(\(c\)|©)?\s*/i, "Copyright: ")}`);
  lines.push(`- Source: ${repoUrl(meta)}`);
  if (licenseText && !isApache) {
    lines.push("- License text:", "", ...licenseText.split(/\r?\n/).map((l) => (l ? "    " + l : "")));
  } else if (!licenseText && !isApache) {
    lines.push("- License text: see the source repository");
  }
  return lines.join("\n") + "\n\n";
}

async function main() {
  const md = await readFile(MD, "utf8");
  if (!md.includes(MARKER)) throw new Error(`Marker line not found in ${relative(ROOT, MD)}`);

  const used = await findCdnPackages();
  const listed = listedPackages(md);

  for (const [name, indirect] of listed) {
    if (!indirect && !used.has(name)) console.warn(`  ! ${name} is listed but no longer referenced; remove it by hand if it is not used`);
  }

  const missing = [...used].filter(([name]) => !listed.has(name));
  if (!missing.length) {
    console.log("THIRD_PARTY_LICENSES.md is up to date.");
    return;
  }

  let entries = "";
  for (const [name, { spec, files }] of missing) {
    console.log(`  + ${name}@${spec} (used in ${[...files].join(", ")})`);
    entries += await buildEntry(name, spec);
  }

  if (CHECK) {
    console.error("THIRD_PARTY_LICENSES.md is missing the libraries above. Run: node scripts/update-third-party-licenses.mjs");
    process.exit(1);
  }
  await writeFile(MD, md.replace(MARKER, entries + MARKER));
  console.log(`Added ${missing.length} librar${missing.length === 1 ? "y" : "ies"} to THIRD_PARTY_LICENSES.md.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
