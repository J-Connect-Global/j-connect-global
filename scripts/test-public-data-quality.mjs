import assert from "node:assert/strict";
import { buildPublicDataQualityReport, baselineFromReport, qualityMarkdown, validateQualityBaseline } from "./report-public-data-quality.mjs";

const report = await buildPublicDataQualityReport();
assert.deepEqual(report.datasets.map((dataset) => dataset.dataset), ["community", "jobs", "eat", "shopping", "medical"]);
const eat = report.datasets.find((dataset) => dataset.dataset === "eat");
const shopping = report.datasets.find((dataset) => dataset.dataset === "shopping");
const medical = report.datasets.find((dataset) => dataset.dataset === "medical");
assert.equal(eat.missing_fields.official_url.count, 5, "Eat official URL aliases were not evaluated with anyOf semantics");
assert.equal(eat.missing_fields.last_reviewed.count, 0, "Eat review date aliases were not evaluated with anyOf semantics");
assert.equal(shopping.missing_fields.official_url.count, 14, "Shopping official URL aliases were not evaluated with anyOf semantics");
assert.equal(shopping.missing_fields.last_reviewed.count, 0, "Shopping review date aliases were not evaluated with anyOf semantics");
assert.equal(eat.directory_capabilities.coverage.coordinates.percent, 47.6, "Eat coordinate coverage must be reported from the committed snapshot");
assert.equal(eat.directory_capabilities.capabilities.map_view, false, "Eat map availability must respect its coverage threshold");
assert.equal(shopping.directory_capabilities.capabilities.rating_filter, true, "Corrected Shopping ratings must enable the coverage-gated filter");
assert.equal(eat.directory_capabilities.capabilities.rating_filter, true, "Corrected Eat ratings must enable the coverage-gated filter");
assert.equal(medical.public_count, 23, "Reviewed active Medical rows must be published");
assert.equal(medical.missing_fields.description.count, 0, "Medical descriptions must remain complete");
assert.equal(medical.missing_fields.official_url.count, 0, "Medical official URLs must remain complete");
assert.match(qualityMarkdown(report), /### Directory feature coverage/, "The GitHub Summary must include directory capability coverage");

const baseline = baselineFromReport(report);
assert.deepEqual(validateQualityBaseline(report, baseline), [], "a matching quality baseline must pass");

const syntheticReport = {
  ...report,
  datasets: report.datasets.map((dataset) => dataset.dataset !== "jobs" ? dataset : {
    ...dataset,
    missing_fields: {
      ...dataset.missing_fields,
      description: { count: 2, ids: ["known-job", "new-incomplete-job"] }
    }
  })
};
const syntheticBaseline = {
  schema_version: 1,
  allowed_missing: {
    jobs: { description: ["known-job"] }
  }
};
assert.match(
  validateQualityBaseline(syntheticReport, syntheticBaseline).join("\n"),
  /new-incomplete-job/,
  "a new incomplete record must fail even when an existing deficit is allowed"
);

console.log("Public data quality tests passed.");
