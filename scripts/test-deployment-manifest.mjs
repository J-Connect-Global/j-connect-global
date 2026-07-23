import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeDeploymentManifest } from "./build-pages-artifact.mjs";
import { verifyDeploymentSha } from "./verify-deployment-sha.mjs";

const expectedSha = "a".repeat(40);
const staleSha = "b".repeat(40);
const builtAt = new Date("2026-07-23T10:00:00.000Z");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "jconnect-deployment-"));
try {
  await writeDeploymentManifest(tempDir, { commitSha: expectedSha, now: builtAt });
  assert.deepEqual(
    JSON.parse(await readFile(path.join(tempDir, "deployment-manifest.json"), "utf8")),
    { schema_version: 1, commit_sha: expectedSha, built_at: builtAt.toISOString() }
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

let calls = 0;
const manifest = await verifyDeploymentSha({
  expectedSha,
  attempts: 2,
  delayMs: 0,
  sleepImpl: async () => {},
  fetchImpl: async () => {
    calls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        schema_version: 1,
        commit_sha: calls === 1 ? staleSha : expectedSha,
        built_at: builtAt.toISOString()
      })
    };
  }
});
assert.equal(calls, 2);
assert.equal(manifest.commit_sha, expectedSha);

await assert.rejects(
  verifyDeploymentSha({
    expectedSha,
    fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) })
  }),
  /HTTP 404/
);
await assert.rejects(
  verifyDeploymentSha({
    expectedSha,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ schema_version: 1, commit_sha: staleSha, built_at: builtAt.toISOString() })
    })
  }),
  /Stale GitHub Pages deployment/
);

console.log("Deployment manifest validation passed.");
