#!/usr/bin/env node
// Renders scripts/og-image.html to public/chordtransposer/og-image.png (1200x630).
// Requires Playwright (once):
//   npm install --no-save playwright && npx playwright install chromium
// Then:
//   node scripts/render-og-image.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const src = new URL("og-image.html", import.meta.url).href;
const out = fileURLToPath(new URL("../public/chordtransposer/og-image.png", import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(src);
await page.screenshot({ path: out });
await browser.close();
console.log("Wrote " + out);
