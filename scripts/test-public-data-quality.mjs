import assert from "node:assert/strict";
import { buildPublicDataQualityReport, baselineFromReport, validateQualityBaseline } from "./report-public-data-quality.mjs";

const report = await buildPublicDataQualityReport();
assert.deepEqual(report.datasets.map((dataset) => dataset.dataset), ["community", "jobs", "eat", "shopping", "medical"]);
const eat = report.datasets.find((dataset) => dataset.dataset === "eat");
const shopping = report.datasets.find((dataset) => dataset.dataset === "shopping");
assert.equal(eat.missing_fields.official_url.count, 5, "Eat official URL aliases were not evaluated with anyOf semantics");
assert.equal(eat.missing_fields.last_reviewed.count, 0, "Eat review date aliases were not evaluated with anyOf semantics");
assert.equal(shopping.missing_fields.official_url.count, 14, "Shopping official URL aliases were not evaluated with anyOf semantics");
assert.equal(shopping.missing_fields.last_reviewed.count, 0, "Shopping review date aliases were not evaluated with anyOf semantics");

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
