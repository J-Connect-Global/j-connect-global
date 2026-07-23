import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const main = await readFile(new URL("../assets/js/main.js", import.meta.url), "utf8");
const tocBlock = main.slice(main.indexOf("var tocLinks"));
assert.match(tocBlock, /new IntersectionObserver/);
assert.doesNotMatch(tocBlock, /getBoundingClientRect/);
assert.doesNotMatch(tocBlock, /addEventListener\(['"]scroll/);

const cookie = await readFile(new URL("../assets/js/cookie-consent.js", import.meta.url), "utf8");
for (const marker of [
  'setAttribute("role", "dialog")',
  'setAttribute("aria-labelledby"',
  'setAttribute("aria-describedby"',
  'event.key !== "Escape"',
  "acceptButton.focus()"
]) assert.match(cookie, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const article = await readFile(
  new URL("../germany/ja/learn-german/appointment-phrase/index.html", import.meta.url),
  "utf8"
);
assert.match(article, /class="jc-table-scroll-hint"/);
assert.match(article, /class="jc-table-wrap" role="region"[^>]+aria-describedby="[^"]+"[^>]+tabindex="0"/);

console.log("Accessibility behavior contracts passed.");
