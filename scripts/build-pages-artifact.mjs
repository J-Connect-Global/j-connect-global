import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePublicDetails } from "./generate-public-details.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectories = ["assets", "germany", "de", "en", "ja"];
const sourceFiles = [
  "index.html", "404.html", "robots.txt", "sitemap.xml", "CNAME", "favicon.ico",
  "site.webmanifest", "manifest.json", "browserconfig.xml"
];
const rootImagePattern = /\.(?:webp|png|jpe?g|svg)$/i;
export const deploymentManifestFilename = "deployment-manifest.json";

async function existsType(file, type) {
  try {
    const entries = await readdir(path.dirname(file), { withFileTypes: true });
    const entry = entries.find((candidate) => candidate.name === path.basename(file));
    return Boolean(entry && (type === "directory" ? entry.isDirectory() : entry.isFile()));
  } catch {
    return false;
  }
}

async function removeHiddenEntries(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.name.startsWith(".")) {
      await rm(target, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      await removeHiddenEntries(target);
    }
  }
}

export async function buildPagesArtifact({
  siteDir = path.join(rootDir, "_site"),
  now = new Date(),
  commitSha
} = {}) {
  const resolvedSite = path.resolve(siteDir);
  if (resolvedSite === rootDir || !resolvedSite.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error("Pages artifact directory must be a child of the repository root.");
  }
  await rm(resolvedSite, { recursive: true, force: true });
  await mkdir(resolvedSite, { recursive: true });

  for (const directory of sourceDirectories) {
    const source = path.join(rootDir, directory);
    if (await existsType(source, "directory")) await cp(source, path.join(resolvedSite, directory), { recursive: true });
  }
  for (const filename of sourceFiles) {
    const source = path.join(rootDir, filename);
    if (await existsType(source, "file")) await cp(source, path.join(resolvedSite, filename));
  }
  for (const entry of await readdir(rootDir, { withFileTypes: true })) {
    if (entry.isFile() && rootImagePattern.test(entry.name)) await cp(path.join(rootDir, entry.name), path.join(resolvedSite, entry.name));
  }
  await removeHiddenEntries(resolvedSite);
  const resolvedCommitSha = resolveCommitSha(commitSha);
  await writeDeploymentManifest(resolvedSite, { commitSha: resolvedCommitSha, now });

  const generated = await generatePublicDetails({ siteDir: resolvedSite, now });
  return { siteDir: resolvedSite, commitSha: resolvedCommitSha, ...generated };
}

export function resolveCommitSha(value) {
  const candidate = String(value || process.env.JCONNECT_DEPLOYMENT_SHA || "").trim()
    || execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/i.test(candidate)) throw new Error("Deployment manifest commit SHA must be a full 40-character Git SHA.");
  return candidate.toLowerCase();
}

export async function writeDeploymentManifest(siteDir, { commitSha, now = new Date() }) {
  const manifest = {
    schema_version: 1,
    commit_sha: resolveCommitSha(commitSha),
    built_at: now.toISOString()
  };
  await writeFile(
    path.join(siteDir, deploymentManifestFilename),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteArg = process.argv.indexOf("--site-dir");
  const siteDir = siteArg >= 0 && process.argv[siteArg + 1] ? path.resolve(process.argv[siteArg + 1]) : path.join(rootDir, "_site");
  const commitArg = process.argv.indexOf("--commit-sha");
  const commitSha = commitArg >= 0 ? process.argv[commitArg + 1] : undefined;
  buildPagesArtifact({ siteDir, commitSha }).then((result) => {
    console.log(`Built ${result.siteDir} at ${result.commitSha} with ${result.community} Community and ${result.jobs} Jobs detail pages (${result.indexableJobs} indexable Jobs).`);
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
