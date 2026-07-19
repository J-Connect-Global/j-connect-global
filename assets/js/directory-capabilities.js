(function (root) {
  "use strict";

  // Directory controls must be driven by the same public snapshot that is
  // rendered on Pages. A feature is not made available simply because one
  // record happens to contain a value.
  const THRESHOLDS = Object.freeze({
    representative_coverage: 0.6,
    minimum_representative_values: 5,
    minimum_distinct_filter_options: 2
  });

  const PLACEHOLDER_CATEGORIES = new Set([
    "",
    "other",
    "other/unclassified",
    "unknown",
    "n/a",
    "na",
    "test",
    "placeholder",
    "その他・未分類",
    "未分類"
  ]);

  function text(value) {
    return String(value ?? "").normalize("NFKC").trim();
  }

  function firstText(item, keys) {
    for (const key of keys) {
      const value = text(item?.[key]);
      if (value) return value;
    }
    return "";
  }

  function positiveNumber(value) {
    const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) && number > 0;
  }

  function nonNegativeNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return false;
    const number = Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) && number >= 0;
  }

  function firstCoordinateValue(item, keys) {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") return value;
    }
    return null;
  }

  function validCoordinates(item) {
    const latitudeValue = firstCoordinateValue(item, ["latitude", "lat", "location/lat"]);
    const longitudeValue = firstCoordinateValue(item, ["longitude", "lng", "lon", "long", "location/lng"]);
    if (latitudeValue === null || longitudeValue === null) return false;
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;
  }

  function normalizedCategory(value) {
    return text(value).toLocaleLowerCase("ja");
  }

  function isPlaceholderCategory(value) {
    return PLACEHOLDER_CATEGORIES.has(normalizedCategory(value));
  }

  // A card already presents title, category, area, address marker, price,
  // rating, public links, description, and any detailed comment. The dialog
  // earns its trigger only when it can add one of these genuinely additional
  // public fields.
  function hasMeaningfulDetail(item) {
    return Boolean(
      firstText(item, ["phone", "telephone", "tel"])
      || firstText(item, ["opening_hours", "openingHours", "hours"])
      || firstText(item, ["language_support", "language", "languages"])
    );
  }

  function metric(items, predicate) {
    const total = items.length;
    const available = items.filter(predicate).length;
    const ratio = total ? available / total : 0;
    return {
      available,
      total,
      ratio,
      percent: Math.round(ratio * 1000) / 10
    };
  }

  function distinctValues(items, getValue, { omitPlaceholders = false } = {}) {
    return [...new Set(items
      .map(getValue)
      .map(text)
      .filter((value) => value && (!omitPlaceholders || !isPlaceholderCategory(value))))]
      .sort((a, b) => a.localeCompare(b, "ja"));
  }

  function supportsRepresentativeMetric(value) {
    return value.available >= THRESHOLDS.minimum_representative_values
      && value.ratio >= THRESHOLDS.representative_coverage;
  }

  function calculate(items) {
    const safeItems = Array.isArray(items) ? items.filter((item) => item && typeof item === "object") : [];
    const options = {
      region: distinctValues(safeItems, (item) => firstText(item, ["region", "city", "area"])),
      category: distinctValues(safeItems, (item) => firstText(item, ["category", "category1"]), { omitPlaceholders: true }),
      detail_category: distinctValues(safeItems, (item) => firstText(item, ["detail_category", "category2", "subcategory"]), { omitPlaceholders: true }),
      price: distinctValues(safeItems, (item) => firstText(item, ["price", "price_range"]))
    };
    const coverage = {
      rating: metric(safeItems, (item) => positiveNumber(firstText(item, ["rating", "totalScore", "score"]))),
      reviews: metric(safeItems, (item) => nonNegativeNumber(firstText(item, ["reviews_count", "reviewsCount", "review_count", "reviews"]))),
      price: metric(safeItems, (item) => Boolean(firstText(item, ["price", "price_range"]))),
      coordinates: metric(safeItems, validCoordinates),
      description: metric(safeItems, (item) => Boolean(firstText(item, ["short_description", "description_ja", "description"]))),
      phone: metric(safeItems, (item) => Boolean(firstText(item, ["phone", "telephone", "tel"]))),
      opening_hours: metric(safeItems, (item) => Boolean(firstText(item, ["opening_hours", "openingHours", "hours"]))),
      detail: metric(safeItems, hasMeaningfulDetail)
    };

    return {
      item_count: safeItems.length,
      thresholds: THRESHOLDS,
      coverage,
      options,
      capabilities: {
        rating_filter: supportsRepresentativeMetric(coverage.rating),
        review_filter: supportsRepresentativeMetric(coverage.reviews),
        price_filter: supportsRepresentativeMetric(coverage.price)
          && options.price.length >= THRESHOLDS.minimum_distinct_filter_options,
        map_view: supportsRepresentativeMetric(coverage.coordinates),
        detail_modal: coverage.detail.available > 0,
        region_filter: options.region.length >= THRESHOLDS.minimum_distinct_filter_options,
        category_filter: options.category.length >= THRESHOLDS.minimum_distinct_filter_options,
        detail_category_filter: options.detail_category.length >= THRESHOLDS.minimum_distinct_filter_options
      }
    };
  }

  const api = Object.freeze({
    THRESHOLDS,
    calculate,
    hasMeaningfulDetail,
    isPlaceholderCategory,
    validCoordinates
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.JCONNECT_DIRECTORY_CAPABILITIES = api;
})(typeof window !== "undefined" ? window : globalThis);
