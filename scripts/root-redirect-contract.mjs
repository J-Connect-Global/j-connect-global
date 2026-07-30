export const ROOT_ROUTE = "/";
export const ROOT_REDIRECT_TARGET_PATH = "/germany/ja/";
export const ROOT_REDIRECT_TARGET = "https://j-connect-global.com/germany/ja/";

const requiredOgProperties = [
  "og:title",
  "og:description",
  "og:url",
  "og:image",
  "og:type",
  "og:site_name",
  "og:locale"
];

const requiredTwitterNames = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image"
];

function attribute(tag, name) {
  const match = String(tag || "").match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function tags(html, name) {
  return String(html || "").match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
}

function metaValue(html, attributeName, expectedValue) {
  for (const tag of tags(html, "meta")) {
    if (attribute(tag, attributeName)?.toLowerCase() === expectedValue.toLowerCase()) {
      return attribute(tag, "content") || "";
    }
  }
  return "";
}

function linkTags(html, rel) {
  return tags(html, "link").filter((tag) => (
    (attribute(tag, "rel") || "").toLowerCase().split(/\s+/).includes(rel)
  ));
}

function normalizeRobots(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
    .sort()
    .join(",");
}

function meaningfulH1Count(html) {
  return [...String(html || "").matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)]
    .map((match) => match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .length;
}

function schemaNodes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaNodes);
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value["@graph"])) return value["@graph"].flatMap(schemaNodes);
  return [value];
}

function rootJsonLdProblems(html) {
  const errors = [];
  for (const [index, match] of [...String(html || "").matchAll(
    /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/gi
  )].entries()) {
    let parsed;
    try {
      parsed = JSON.parse(match[2]);
    } catch (error) {
      errors.push(`root JSON-LD ${index + 1} is invalid (${error.message})`);
      continue;
    }
    for (const node of schemaNodes(parsed)) {
      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      if (types.includes("WebPage")) {
        errors.push("root redirect must not declare a standalone WebPage entity");
      }
    }
  }
  return errors;
}

export function validateRootRedirectHtml(html) {
  const errors = [];
  const source = String(html || "");
  const htmlLang = source.match(/<html\b[^>]*\blang\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() || "";
  if (htmlLang !== "ja") errors.push('root redirect must use <html lang="ja">');

  const title = source.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
  if (!title) errors.push("root redirect is missing a title");
  if (!metaValue(source, "name", "description").trim()) errors.push("root redirect is missing a meta description");
  if (normalizeRobots(metaValue(source, "name", "robots")) !== "follow,index") {
    errors.push('root redirect must use robots "index, follow" without noindex or nofollow');
  }

  const canonicalLinks = linkTags(source, "canonical");
  if (canonicalLinks.length !== 1 || attribute(canonicalLinks[0], "href") !== ROOT_REDIRECT_TARGET) {
    errors.push(`root redirect must have exactly one canonical for ${ROOT_REDIRECT_TARGET}`);
  }

  const refreshTags = tags(source, "meta").filter((tag) => (
    attribute(tag, "http-equiv")?.toLowerCase() === "refresh"
  ));
  const refreshContent = refreshTags.length === 1 ? attribute(refreshTags[0], "content") || "" : "";
  const refreshPattern = new RegExp(`^\\s*0\\s*;\\s*url\\s*=\\s*${ROOT_REDIRECT_TARGET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
  if (refreshTags.length !== 1 || !refreshPattern.test(refreshContent)) {
    errors.push(`root redirect must have one zero-second meta refresh to ${ROOT_REDIRECT_TARGET}`);
  }

  const destinationPattern = new RegExp(
    `\\b(?:var|const|let)\\s+destination\\s*=\\s*(["'])${ROOT_REDIRECT_TARGET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1\\s*;`
  );
  if (!destinationPattern.test(source)) {
    errors.push("root redirect JavaScript must declare the fixed Germany Japanese destination");
  }
  if (!/\b(?:var|const|let)\s+suffix\s*=\s*window\.location\.search\s*\+\s*window\.location\.hash\s*;/.test(source)) {
    errors.push("root redirect JavaScript must preserve the original query string and fragment as a suffix");
  }
  const replaceCalls = source.match(/\bwindow\.location\.replace\s*\(/g) || [];
  if (replaceCalls.length !== 1 || !/\bwindow\.location\.replace\s*\(\s*destination\s*\+\s*suffix\s*\)\s*;/.test(source)) {
    errors.push("root redirect JavaScript must call window.location.replace(destination + suffix) exactly once");
  }
  if (/\b(?:window\.)?location\.assign\s*\(|\b(?:window\.)?location\.href\s*=/.test(source)) {
    errors.push("root redirect must not use location.assign() or assign location.href");
  }

  for (const property of requiredOgProperties) {
    if (!metaValue(source, "property", property).trim()) errors.push(`root redirect is missing ${property}`);
  }
  if (metaValue(source, "property", "og:url") !== ROOT_REDIRECT_TARGET) {
    errors.push(`root redirect og:url must be ${ROOT_REDIRECT_TARGET}`);
  }
  for (const name of requiredTwitterNames) {
    if (!metaValue(source, "name", name).trim()) errors.push(`root redirect is missing ${name}`);
  }
  if (!linkTags(source, "icon").length) errors.push("root redirect is missing a favicon link");

  if (linkTags(source, "alternate").some((tag) => attribute(tag, "hreflang"))) {
    errors.push("root redirect must not contain hreflang alternates");
  }
  if (meaningfulH1Count(source) !== 1) errors.push("root redirect fallback must contain exactly one meaningful H1");

  const anchors = tags(source, "a");
  if (!anchors.some((tag) => attribute(tag, "href") === ROOT_REDIRECT_TARGET_PATH)) {
    errors.push(`root redirect fallback must link directly to ${ROOT_REDIRECT_TARGET_PATH}`);
  }
  if (!anchors.some((tag) => attribute(tag, "href") === "#main-content")) {
    errors.push("root redirect fallback must contain a skip link to #main-content");
  }
  const main = tags(source, "main").find((tag) => attribute(tag, "id") === "main-content");
  if (!main || attribute(main, "tabindex") !== "-1") {
    errors.push('root redirect fallback must contain <main id="main-content" tabindex="-1">');
  }

  for (const obsoleteMarker of ["global-home", "global-hero", "global-category-grid", "global-start-list"]) {
    if (source.includes(obsoleteMarker)) errors.push(`root redirect retains obsolete landing-page marker: ${obsoleteMarker}`);
  }

  errors.push(...rootJsonLdProblems(source));
  return errors;
}
