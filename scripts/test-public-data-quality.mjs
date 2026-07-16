import assert from "node:assert/strict";
import { buildPublicDataQualityReport, baselineFromReport, validateQualityBaseline } from "./report-public-data-quality.mjs";

const report = await buildPublicDataQualityReport();
assert.deepEqual(report.datasets.map((dataset) => dataset.dataset), ["community", "jobs", "eat", "shopping", "medical"]);
assert.equal(report.datasets.find((dataset) => dataset.dataset === "jobs").public_sample_or_test_records.length, 0, "sample jobs reached the public snapshot");

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

const sampleLeakReport = {
  ...report,
  datasets: report.datasets.map((dataset) => dataset.dataset !== "jobs" ? dataset : {
    ...dataset,
    public_sample_or_test_records: ["sample-fixture"]
  })
};
assert.match(validateQualityBaseline(sampleLeakReport, baseline).join("\n"), /sample-fixture/);
console.log("Public data quality tests passed.");
