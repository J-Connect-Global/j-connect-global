import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../apps-script/letter-explainer/Code.gs", import.meta.url), "utf8");

assert.match(source, /HEAVY_EFFORT\s+任意。既定 medium。/);
assert.match(source, /if \(heavy\) return String\(props\.getProperty\('HEAVY_EFFORT'\) \|\| 'medium'\)\.trim\(\);/);
assert.match(source, /WEB_SEARCH\s+任意。既定 off。/);
assert.match(source, /getProperty\('WEB_SEARCH'\) \|\| 'off'\)\.trim\(\)\.toLowerCase\(\) === 'on'/);
assert.doesNotMatch(source, /WEB_SEARCH.*既定 on|HEAVY_EFFORT.*既定 high|既定はオン/);

console.log("Letter explainer cost-safe defaults passed.");
