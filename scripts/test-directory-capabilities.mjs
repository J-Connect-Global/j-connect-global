import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const capabilities = require("../assets/js/directory-capabilities.js");

function items(total, makeItem) {
  return Array.from({ length: total }, (_, index) => makeItem(index));
}

function ratingItems(total, populated) {
  return items(total, (index) => ({ rating: index < populated ? 4.2 : "" }));
}

function coordinateItems(total, populated) {
  return items(total, (index) => index < populated
    ? { lat: 51.2 + index / 100, lng: 6.7 + index / 100 }
    : {});
}

assert.equal(
  capabilities.calculate(ratingItems(5, 4)).capabilities.rating_filter,
  false,
  "A control needs at least five populated values, even when coverage is high."
);
assert.equal(
  capabilities.calculate(ratingItems(9, 5)).capabilities.rating_filter,
  false,
  "A control stays hidden below 60% coverage."
);
assert.equal(
  capabilities.calculate(ratingItems(8, 5)).capabilities.rating_filter,
  true,
  "A control appears automatically at five values and 60% coverage."
);

const reviewBoundary = items(8, (index) => ({ reviews_count: index < 5 ? 0 : "" }));
assert.equal(
  capabilities.calculate(reviewBoundary).capabilities.review_filter,
  true,
  "A zero review count is a known public value, not a missing value."
);

const onePriceTier = items(8, (index) => ({ price: index < 5 ? "€10–20" : "" }));
assert.equal(
  capabilities.calculate(onePriceTier).capabilities.price_filter,
  false,
  "A price control needs two meaningful tiers."
);
const twoPriceTiers = items(8, (index) => ({
  price: index < 5 ? (index % 2 ? "€10–20" : "€20–30") : ""
}));
assert.equal(
  capabilities.calculate(twoPriceTiers).capabilities.price_filter,
  true,
  "A price control appears when coverage and tier diversity are both sufficient."
);

assert.equal(
  capabilities.calculate(coordinateItems(5, 4)).capabilities.map_view,
  false,
  "A map needs at least five verified coordinate pairs."
);
assert.equal(
  capabilities.calculate(coordinateItems(9, 5)).capabilities.map_view,
  false,
  "A map stays hidden below 60% verified coordinate coverage."
);
assert.equal(
  capabilities.calculate(coordinateItems(8, 5)).capabilities.map_view,
  true,
  "A map appears automatically at the documented coverage boundary."
);
assert.equal(capabilities.validCoordinates({ latitude: 0, longitude: 0 }), true, "Zero is a valid coordinate value.");

const taxonomy = capabilities.calculate([
  { category: "other", detail_category: "unknown" },
  { category: "Food", detail_category: "Restaurant" },
  { category: "Market", detail_category: "Cafe" }
]);
assert.deepEqual(taxonomy.options.category, ["Food", "Market"], "Placeholder taxonomy values must not become filters.");
assert.equal(taxonomy.capabilities.category_filter, true, "Two real categories enable the category filter.");

assert.equal(
  capabilities.calculate([{ detail_comment: "Already shown on the card" }]).capabilities.detail_modal,
  false,
  "A repeated card comment must not create an empty-value modal."
);
assert.equal(
  capabilities.calculate([{ phone: "+49 211 123456" }]).capabilities.detail_modal,
  true,
  "A record with additional public details can expose a modal trigger."
);

const eat = JSON.parse(await readFile(new URL("../assets/data/eat/items.json", import.meta.url), "utf8"));
const shopping = JSON.parse(await readFile(new URL("../assets/data/shopping/items.json", import.meta.url), "utf8"));
const medical = JSON.parse(await readFile(new URL("../assets/data/medical/items.json", import.meta.url), "utf8"));
const eatCapabilities = capabilities.calculate(eat.items).capabilities;
const shoppingCapabilities = capabilities.calculate(shopping.items).capabilities;
const medicalCapabilities = capabilities.calculate(medical.items).capabilities;

assert.deepEqual(
  eatCapabilities,
  {
    rating_filter: true,
    review_filter: true,
    price_filter: true,
    map_view: false,
    detail_modal: false,
    region_filter: false,
    category_filter: false,
    detail_category_filter: true
  },
  "Eat controls must match its committed public coverage."
);
assert.deepEqual(
  shoppingCapabilities,
  {
    rating_filter: true,
    review_filter: true,
    price_filter: false,
    map_view: false,
    detail_modal: false,
    region_filter: false,
    category_filter: true,
    detail_category_filter: true
  },
  "Shopping controls must match its committed public coverage."
);
assert.deepEqual(
  medicalCapabilities,
  {
    rating_filter: false,
    review_filter: true,
    price_filter: false,
    map_view: false,
    detail_modal: false,
    region_filter: true,
    category_filter: true,
    detail_category_filter: false
  },
  "Medical controls must match its committed public coverage."
);

console.log("Directory capability tests passed.");
