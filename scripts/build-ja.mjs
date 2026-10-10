#!/usr/bin/env node
// Generates public/chordtransposer/ja/index.html (the Japanese page) from
// public/chordtransposer/index.html, so only index.html is edited by hand.
//
// - <head>: lang, title, description, canonical, Open Graph, and JSON-LD are
//   replaced with the Japanese versions below. <base href="/chordtransposer/">
//   is added so relative URLs (icons, manifest, sw.js, THIRD_PARTY_LICENSES.md)
//   still point to the files in public/chordtransposer/.
// - <body>: the text of data-i18n / data-i18n-html / data-i18n-attr elements
//   is replaced with the Japanese strings from the I18N object in index.html,
//   so search engines see Japanese text without running JavaScript.
// - <html data-page-lang="ja"> makes the app show Japanese regardless of the
//   browser language (?lang=en still switches to English).
//
// Every replacement must match exactly once; otherwise the script fails, so a
// change in index.html that breaks it is noticed instead of silently ignored.
//
// Usage: node scripts/build-ja.mjs [--check]
//   --check  do not write; exit 1 if ja/index.html is out of date.
// Runs automatically before `wrangler deploy` / `wrangler dev` (build.command in wrangler.jsonc).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SRC = fileURLToPath(new URL("../public/chordtransposer/index.html", import.meta.url));
const OUT = fileURLToPath(new URL("../public/chordtransposer/ja/index.html", import.meta.url));
const CHECK = process.argv.includes("--check");

const BASE_URL = "https://ktkwmr.com/chordtransposer/";
const JA_URL = BASE_URL + "ja/";

// Japanese text for search results and social media shares
const TITLE = "Chord Transposer – コード譜をブラウザで転調・移調できる無料Webアプリ";
const DESCRIPTION = "コード譜をブラウザで転調（移調）できる無料Webアプリ。テキストを貼り付けるか、TXT・PDF・画像ファイル（OCR）を開いて、キーを変えて保存できます。登録不要で、オフラインでも使えます。";
const OG_DESCRIPTION = "コード譜をブラウザで転調（移調）。テキストの貼り付けや、TXT・PDF・画像ファイルの読み込みに対応。無料・登録不要・オフライン対応。";
const OG_IMAGE_ALT = "Chord Transposer：C、Am7、F/G を +2 転調して D、Bm7、G/A に";
const LD_DESCRIPTION = "コード譜をブラウザで転調（移調）できるWebアプリ。テキストの貼り付けや、TXT・PDF・画像ファイルの読み込みに対応。";

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const src = await readFile(SRC, "utf8");
const headEnd = src.indexOf("</head>");
if (headEnd < 0) throw new Error("</head> not found in index.html");
// <head> only: the scripts in <body> also contain tags like <title>
let head = src.slice(0, headEnd);

function replaceOnce(pattern, replacement, label) {
  const count = (head.match(new RegExp(pattern.source, "g")) || []).length;
  if (count !== 1) throw new Error(`${label}: expected 1 match in the <head> of index.html, found ${count}`);
  head = head.replace(pattern, replacement);
}

// ---------- <head> ----------
replaceOnce(/<html lang="en">/, '<html lang="ja" data-page-lang="ja">', "html lang");
replaceOnce(/(<meta charset="UTF-8" \/>\n)/, '$1  <base href="/chordtransposer/" />\n', "base");
replaceOnce(/<title>[^<]*<\/title>/, `<title>${escapeText(TITLE)}</title>`, "title");
replaceOnce(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(DESCRIPTION)}$2`, "description");
replaceOnce(/(<link rel="canonical" href=")[^"]*(")/, `$1${JA_URL}$2`, "canonical");
replaceOnce(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(TITLE)}$2`, "og:title");
replaceOnce(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(OG_DESCRIPTION)}$2`, "og:description");
replaceOnce(/(<meta property="og:locale" content=")[^"]*(")/, "$1ja_JP$2", "og:locale");
replaceOnce(/(<meta property="og:locale:alternate" content=")[^"]*(")/, "$1en_US$2", "og:locale:alternate");
replaceOnce(/(<meta property="og:url" content=")[^"]*(")/, `$1${JA_URL}$2`, "og:url");
replaceOnce(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${escapeAttr(OG_IMAGE_ALT)}$2`, "og:image:alt");
replaceOnce(/("url": ")https:\/\/ktkwmr\.com\/chordtransposer\/(")/, `$1${JA_URL}$2`, "JSON-LD url");
replaceOnce(/("description": ")[^"]*(")/, `$1${LD_DESCRIPTION}$2`, "JSON-LD description");
replaceOnce(/"inLanguage": "en"/, '"inLanguage": "ja"', "JSON-LD inLanguage");

let html = head + src.slice(headEnd);

// ---------- <body> ----------
// Read the I18N object literal from the app script
const m = src.match(/const I18N = (\{[\s\S]*?\n {6}\});/);
if (!m) throw new Error("I18N object not found in index.html");
const I18N = vm.runInNewContext("(" + m[1] + ")");
const ja = (key) => {
  if (!(key in I18N.ja)) throw new Error(`I18N.ja has no key "${key}"`);
  return I18N.ja[key];
};

// Only the app markup is translated (not the script, which also contains these attribute names)
const bodyStart = html.indexOf("<body>");
const scriptStart = html.indexOf("<script>", bodyStart);
let body = html.slice(bodyStart, scriptStart);
const expected = (body.match(/\sdata-i18n(?:-html|-attr)?="/g) || []).length;
let done = 0;

// data-i18n: plain text content
body = body.replace(/(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (all, open, tag, key, text, close) => {
  done++;
  return open + escapeText(ja(key)) + close;
});
// data-i18n-html: fixed HTML content (ends at the first closing tag of the same name)
body = body.replace(/(<(\w+)\b[^>]*\sdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (all, open, tag, key, inner, close) => {
  done++;
  return open + ja(key) + close;
});
// data-i18n-attr: attribute values ("attr:key;attr:key")
body = body.replace(/<\w+\b[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
  done++;
  for (const pair of spec.split(";")) {
    const [attr, key] = pair.split(":");
    const re = new RegExp(`(\\s${attr}=")[^"]*(")`);
    if (!re.test(tag)) throw new Error(`data-i18n-attr: ${attr}="…" not found in ${tag}`);
    tag = tag.replace(re, `$1${escapeAttr(ja(key))}$2`);
  }
  return tag;
});
if (done !== expected) throw new Error(`Translated ${done} of ${expected} data-i18n elements; check the markup in index.html`);
html = html.slice(0, bodyStart) + body + html.slice(scriptStart);

html = html.replace(/^<!DOCTYPE html>\n/, "<!DOCTYPE html>\n<!-- Generated from ../index.html by scripts/build-ja.mjs. Do not edit. -->\n");

// ---------- write ----------
let current = null;
try { current = await readFile(OUT, "utf8"); } catch {}
if (current === html) {
  console.log("ja/index.html is up to date.");
} else if (CHECK) {
  console.error("ja/index.html is out of date. Run: node scripts/build-ja.mjs");
  process.exit(1);
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, html);
  console.log("Wrote " + OUT);
}
