import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_MANIFEST_URL = "https://j-connect-global.com/deployment-manifest.json";

function fullSha(value, label) {
  const sha = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`${label} must be a full 40-character Git SHA.`);
  return sha;
}

function httpsUrl(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:") throw new Error("Deployment manifest URL must use HTTPS.");
  return url;
}

export async function fetchDeploymentManifest(url, {
  fetchImpl = fetch,
  timeoutMs = 10_000,
  cacheBust = ""
} = {}) {
  const manifestUrl = httpsUrl(url);
  if (cacheBust) manifestUrl.searchParams.set("deployment_check", cacheBust);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(manifestUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "J-Connect deployment SHA verifier" }
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Deployment manifest request timed out after ${timeoutMs}ms.`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response?.ok) throw new Error(`Deployment manifest request failed with HTTP ${response?.status ?? "unknown"}.`);
  const manifest = await response.json();
  if (manifest?.schema_version !== 1) throw new Error("Deployment manifest schema_version must be 1.");
  manifest.commit_sha = fullSha(manifest.commit_sha, "Deployment manifest commit_sha");
  if (!Number.isFinite(Date.parse(manifest.built_at))) throw new Error("Deployment manifest built_at must be an ISO timestamp.");
  return manifest;
}

export async function verifyDeploymentSha({
  expectedSha,
  url = DEFAULT_MANIFEST_URL,
  attempts = 1,
  delayMs = 5_000,
  timeoutMs = 10_000,
  fetchImpl = fetch,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
}) {
  const expected = fullSha(expectedSha, "Expected deployment SHA");
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const manifest = await fetchDeploymentManifest(url, {
        fetchImpl,
        timeoutMs,
        cacheBust: `${expected}-${attempt}`
      });
      if (manifest.commit_sha === expected) return manifest;
      lastError = new Error(`Stale GitHub Pages deployment detected: expected ${expected}, found ${manifest.commit_sha}.`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleepImpl(delayMs);
  }
  throw lastError;
}

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

export async function main() {
  const expectedSha = argument("--expected-sha", process.env.JCONNECT_EXPECTED_DEPLOYMENT_SHA);
  const url = argument("--url", process.env.JCONNECT_DEPLOYMENT_MANIFEST_URL || DEFAULT_MANIFEST_URL);
  const attempts = Number(argument("--attempts", "1"));
  const delayMs = Number(argument("--delay-ms", "5000"));
  const manifest = await verifyDeploymentSha({ expectedSha, url, attempts, delayMs });
  console.log(`Production deployment manifest matches ${manifest.commit_sha} (built ${manifest.built_at}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
