import { readFileSync } from "node:fs";

const source = JSON.parse(readFileSync(new URL("../content/site-identity.json", import.meta.url), "utf8"));

for (const key of [
  "serviceName",
  "serviceNameUpper",
  "parentBrandName",
  "origin",
  "jaHomePath",
  "tagline",
  "relationship",
  "copyrightHolder"
]) {
  if (typeof source[key] !== "string" || !source[key].trim()) {
    throw new Error(`content/site-identity.json is missing ${key}.`);
  }
}

export const SITE_IDENTITY = Object.freeze({ ...source });
export const SERVICE_NAME = SITE_IDENTITY.serviceName;
export const PARENT_BRAND_NAME = SITE_IDENTITY.parentBrandName;
export const SITE_ORIGIN = SITE_IDENTITY.origin;
export const PRIMARY_JA_PATH = SITE_IDENTITY.jaHomePath;

export function serviceTitle(value) {
  const title = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!title || title === PARENT_BRAND_NAME || title === SERVICE_NAME) return SERVICE_NAME;
  const normalized = title.replaceAll(PARENT_BRAND_NAME, SERVICE_NAME);
  return normalized.includes(SERVICE_NAME) ? normalized : `${normalized} | ${SERVICE_NAME}`;
}

export function replaceAccidentalParentBrand(value) {
  return String(value ?? "").replaceAll(PARENT_BRAND_NAME, SERVICE_NAME);
}
