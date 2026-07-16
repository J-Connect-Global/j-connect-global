import { cp, mkdir, readdir, rm } from "node:fs/promises";
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

export async function buildPagesArtifact({ siteDir = path.join(rootDir, "_site"), now = new Date() } = {}) {
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

  const generated = await generatePublicDetails({ siteDir: resolvedSite, now });
  return { siteDir: resolvedSite, ...generated };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteArg = process.argv.indexOf("--site-dir");
  const siteDir = siteArg >= 0 && process.argv[siteArg + 1] ? path.resolve(process.argv[siteArg + 1]) : path.join(rootDir, "_site");
  buildPagesArtifact({ siteDir }).then((result) => {
    console.log(`Built ${result.siteDir} with ${result.community} Community and ${result.jobs} Jobs detail pages (${result.indexableJobs} indexable Jobs).`);
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
