import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SITE_IDENTITY,
  SERVICE_NAME,
  PARENT_BRAND_NAME,
  SITE_ORIGIN
} from "./site-identity.mjs";
import { ROOT_REDIRECT_TARGET } from "./root-redirect-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDirIndex = process.argv.indexOf("--site-dir");
const siteRoot = siteDirIndex >= 0 && process.argv[siteDirIndex + 1]
  ? path.resolve(root, process.argv[siteDirIndex + 1])
  : root;
const problems = [];
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const PARENT_ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const REGIONAL_ORGANIZATION_ID = `${ROOT_REDIRECT_TARGET}#organization`;
const REGIONAL_WEBPAGE_ID = `${ROOT_REDIRECT_TARGET}#webpage`;

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, output);
    else if (entry.isFile() && entry.name.endsWith(".html")) output.push(file);
  }
  return output;
}

function value(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function types(node) {
  return (Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]]).filter(Boolean);
}

function topLevelSchemaNodes(html, label) {
  const nodes = [];
  const scripts = [...html.matchAll(
    /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/gi
  )];
  for (const [index, match] of scripts.entries()) {
    try {
      const parsed = JSON.parse(match[2]);
      const documents = Array.isArray(parsed) ? parsed : [parsed];
      for (const document of documents) {
        if (Array.isArray(document?.["@graph"])) nodes.push(...document["@graph"]);
        else if (document && typeof document === "object") nodes.push(document);
      }
    } catch (error) {
      problems.push(`${label} has invalid JSON-LD #${index + 1}: ${error.message}`);
    }
  }
  return nodes;
}

function collectObjects(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectObjects(entry, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  output.push(value);
  Object.values(value).forEach((entry) => collectObjects(entry, output));
  return output;
}

function expectIdReference(value, expected, label) {
  if (!value || typeof value !== "object" || value["@id"] !== expected) {
    problems.push(`${label} must reference ${expected}.`);
  }
}

function validateStableReferences(html, label) {
  const objects = topLevelSchemaNodes(html, label).flatMap((node) => collectObjects(node));
  for (const object of objects) {
    if (object["@id"] === WEBSITE_ID) {
      if (object["@type"] && !types(object).includes("WebSite")) {
        problems.push(`${label} assigns a conflicting type to ${WEBSITE_ID}.`);
      }
      if (object.name && object.name !== PARENT_BRAND_NAME) {
        problems.push(`${label} assigns a conflicting name to ${WEBSITE_ID}.`);
      }
      if (object.url && object.url !== `${SITE_ORIGIN}/`) {
        problems.push(`${label} assigns a conflicting URL to ${WEBSITE_ID}.`);
      }
      if (object.publisher) expectIdReference(object.publisher, PARENT_ORGANIZATION_ID, `${label} WebSite publisher`);
    }
    if (object["@id"] === PARENT_ORGANIZATION_ID) {
      if (object["@type"] && !types(object).includes("Organization")) {
        problems.push(`${label} assigns a conflicting type to ${PARENT_ORGANIZATION_ID}.`);
      }
      if (object.name && object.name !== PARENT_BRAND_NAME) {
        problems.push(`${label} assigns a conflicting name to ${PARENT_ORGANIZATION_ID}.`);
      }
      if (object.url && object.url !== `${SITE_ORIGIN}/`) {
        problems.push(`${label} assigns a conflicting URL to ${PARENT_ORGANIZATION_ID}.`);
      }
    }
    if (object["@id"] === REGIONAL_ORGANIZATION_ID) {
      if (object["@type"] && !types(object).includes("Organization")) {
        problems.push(`${label} assigns a conflicting type to ${REGIONAL_ORGANIZATION_ID}.`);
      }
      if (object.name && object.name !== SERVICE_NAME) {
        problems.push(`${label} assigns a conflicting name to ${REGIONAL_ORGANIZATION_ID}.`);
      }
      if (object.url && object.url !== ROOT_REDIRECT_TARGET) {
        problems.push(`${label} assigns a conflicting URL to ${REGIONAL_ORGANIZATION_ID}.`);
      }
      if (object.parentOrganization) {
        expectIdReference(object.parentOrganization, PARENT_ORGANIZATION_ID, `${label} regional parentOrganization`);
      }
    }
  }
}

const identityScript = fs.readFileSync(path.join(siteRoot, "assets/js/site-identity.js"), "utf8");
for (const expected of [SITE_IDENTITY.serviceName, SITE_IDENTITY.parentBrandName, SITE_IDENTITY.relationship]) {
  if (!identityScript.includes(expected)) problems.push(`assets/js/site-identity.js is missing ${expected}.`);
}

const jaFiles = walk(path.join(siteRoot, "germany", "ja"));
for (const file of jaFiles) {
  const relative = path.relative(siteRoot, file).replaceAll(path.sep, "/");
  const html = fs.readFileSync(file, "utf8");
  const title = value(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const siteName = value(html, /<meta\b(?=[^>]*property=["']og:site_name["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>/i);
  if (!html.includes("/assets/js/site-identity.js")) problems.push(`${relative} does not load the shared site identity.`);
  if (title.includes(PARENT_BRAND_NAME)) problems.push(`${relative} uses the parent brand as the page-title site name.`);
  if (siteName && siteName !== SERVICE_NAME) problems.push(`${relative} has og:site_name=${siteName}.`);
  if (/class=["']brand-title["'][^>]*>\s*J-CONNECT GLOBAL/i.test(html)) problems.push(`${relative} has the old header brand title.`);
  if (/class=["']footer-title["'][^>]*>\s*J-CONNECT GLOBAL/i.test(html)) problems.push(`${relative} has the old footer service title.`);
  if (/alt=["']J-Connect Global["']/i.test(html)) problems.push(`${relative} has a parent-brand-only image alt.`);
  if (/\{\{(?:service_name|service_name_upper|service_logo_alt|tagline|relationship|copyright_holder)\}\}/.test(html)) {
    problems.push(`${relative} contains an unresolved identity template token.`);
  }
  validateStableReferences(html, relative);
}

const rootHome = fs.readFileSync(path.join(siteRoot, "index.html"), "utf8");
const rootNodes = topLevelSchemaNodes(rootHome, "index.html");
const rootWebsites = rootNodes.filter((node) => types(node).includes("WebSite"));
if (rootWebsites.length !== 1) {
  problems.push(`Domain root must define exactly one WebSite entity, found ${rootWebsites.length}.`);
} else {
  const website = rootWebsites[0];
  if (website["@id"] !== WEBSITE_ID || website.name !== PARENT_BRAND_NAME || website.url !== `${SITE_ORIGIN}/`) {
    problems.push("Domain-root WebSite must preserve the stable parent-brand ID, name, and URL.");
  }
  expectIdReference(website.publisher, PARENT_ORGANIZATION_ID, "Domain-root WebSite publisher");
}

const rootOrganizations = rootNodes.filter((node) => types(node).includes("Organization"));
if (rootOrganizations.length !== 1) {
  problems.push(`Domain root must define exactly one parent Organization entity, found ${rootOrganizations.length}.`);
} else {
  const organization = rootOrganizations[0];
  if (organization["@id"] !== PARENT_ORGANIZATION_ID || organization.name !== PARENT_BRAND_NAME || organization.url !== `${SITE_ORIGIN}/`) {
    problems.push("Domain-root Organization must preserve the stable parent-brand ID, name, and URL.");
  }
  const regional = organization.subOrganization;
  if (!regional || regional["@id"] !== REGIONAL_ORGANIZATION_ID || regional.name !== SERVICE_NAME || regional.url !== ROOT_REDIRECT_TARGET) {
    problems.push("Parent Organization must retain the accurate J-Connect Germany subOrganization relationship.");
  }
}
if (rootNodes.some((node) => types(node).includes("WebPage"))) {
  problems.push("Domain-root redirect must not define a standalone WebPage entity.");
}
if (!rootHome.includes(`<meta property="og:site_name" content="${PARENT_BRAND_NAME}">`)) {
  problems.push("Domain-root og:site_name does not use the parent brand name.");
}
validateStableReferences(rootHome, "index.html");

const germanyHome = fs.readFileSync(path.join(siteRoot, "germany/ja/index.html"), "utf8");
const germanyNodes = topLevelSchemaNodes(germanyHome, "germany/ja/index.html");
const regionalPages = germanyNodes.filter((node) => (
  types(node).includes("WebPage") && (node["@id"] === REGIONAL_WEBPAGE_ID || node.url === ROOT_REDIRECT_TARGET)
));
if (regionalPages.length !== 1) {
  problems.push(`Germany home must define exactly one regional WebPage, found ${regionalPages.length}.`);
} else {
  const regionalPage = regionalPages[0];
  if (regionalPage["@id"] !== REGIONAL_WEBPAGE_ID || regionalPage.url !== ROOT_REDIRECT_TARGET) {
    problems.push("Germany WebPage must preserve its regional @id and URL.");
  }
  if (!String(regionalPage.name || "").startsWith(SERVICE_NAME)) {
    problems.push("Germany WebPage name must identify J-Connect Germany.");
  }
  expectIdReference(regionalPage.isPartOf, WEBSITE_ID, "Germany WebPage isPartOf");
  expectIdReference(regionalPage.publisher, PARENT_ORGANIZATION_ID, "Germany WebPage publisher");
  const about = regionalPage.about;
  if (!about || about["@id"] !== REGIONAL_ORGANIZATION_ID || about.name !== SERVICE_NAME || about.url !== ROOT_REDIRECT_TARGET) {
    problems.push("Germany WebPage must identify the regional J-Connect Germany organization.");
  } else {
    expectIdReference(about.parentOrganization, PARENT_ORGANIZATION_ID, "Germany regional Organization parentOrganization");
  }
}
if (germanyNodes.some((node) => types(node).includes("WebSite"))) {
  problems.push("Germany subdirectory home must not declare a second WebSite entity.");
}
if (!germanyHome.includes(SITE_IDENTITY.tagline) || !germanyHome.includes(SITE_IDENTITY.relationship)) {
  problems.push("Germany home must preserve the visible J-Connect Global parent-brand relationship.");
}

if (problems.length) {
  console.error("Site identity validation failed:");
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`Site identity validation passed: ${jaFiles.length} JA pages share one coherent ${PARENT_BRAND_NAME} WebSite and Organization graph with ${SERVICE_NAME}.`);
}
