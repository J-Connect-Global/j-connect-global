import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://j-connect-global.com";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BUDGET = path.join(rootDir, "content/quality-baselines/site-artifact-budget.json");
const STATIC_REFERENCE_ATTRIBUTES = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns"];
const NO_STATIC_H1_ALLOWLIST = new Set([
  "/germany/ja/events/detail/",
  "/germany/ja/jobs/detail/"
]);

function walkFiles(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

function toRoute(siteDir, file) {
  const relative = path.relative(siteDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -10)}`;
  return `/${relative}`;
}

function stripNonStaticMarkup(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
}

function decodeAttribute(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (match, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (match, number) => String.fromCodePoint(Number.parseInt(number, 16)));
}

function parseAttributes(tag) {
  const attributes = new Map();
  const body = tag.replace(/^<\/?[a-z0-9:-]+/i, "").replace(/\/?>$/, "");
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes.set(name, decodeAttribute(value));
  }
  return attributes;
}

function openingTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => ({
    tag: match[0],
    attributes: parseAttributes(match[0])
  }));
}

function safeDecodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function safeDecodeFragment(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

function resolveUrl(value, route) {
  const input = decodeAttribute(value).trim();
  if (!input || /^(?:mailto|tel|javascript|data|blob):/i.test(input)) return null;
  try {
    return new URL(input, `${ORIGIN}${route}`);
  } catch {
    return false;
  }
}

function localFileForPath(siteDir, pathname) {
  const decoded = safeDecodePathname(pathname);
  const candidate = path.resolve(siteDir, `.${decoded}`);
  const sitePrefix = `${path.resolve(siteDir)}${path.sep}`;
  if (candidate !== path.resolve(siteDir) && !candidate.startsWith(sitePrefix)) return null;
  try {
    if (fs.statSync(candidate).isFile()) return candidate;
    const indexFile = path.join(candidate, "index.html");
    if (fs.statSync(indexFile).isFile()) return indexFile;
  } catch {
    return null;
  }
  return null;
}

function canonicalTargetRoute(aliases, pathname) {
  const decoded = safeDecodePathname(pathname);
  return aliases.get(decoded) || aliases.get(decoded.replace(/\/+$/, "")) || null;
}

function isIndexable(staticHtml) {
  for (const { attributes } of openingTags(staticHtml, "meta")) {
    if ((attributes.get("name") || "").toLowerCase() !== "robots") continue;
    return !/(?:^|,|\s)noindex(?:,|\s|$)/i.test(attributes.get("content") || "");
  }
  return true;
}

function textContent(value) {
  return decodeAttribute(String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function classifyTemplate(route, staticHtml) {
  if (route === "/") return "global";
  if (route === "/germany/ja/") return "portal";
  if (
    /data-generated-public-detail/i.test(staticHtml)
    || /^\/germany\/ja\/community\/posts\/[^/]+\/$/.test(route)
    || /^\/germany\/ja\/jobs\/openings\/[^/]+\/$/.test(route)
    || /^\/germany\/ja\/jobs\/(?!guide\/|posting\/|detail\/)[^/]+\/$/.test(route)
  ) return "detail";
  if (
    /class=["'][^"']*(?:article-page|article-shell|article-layout)[^"']*["']/i.test(staticHtml)
    || /^\/germany\/ja\/(?:living|learn-german|events)\/[^/]+\/$/.test(route)
  ) return "article";
  if (
    /^\/germany\/ja\/(?:living|learn-german|events)\/$/.test(route)
    || /^\/germany\/ja\/living\/(?:routes|travel)\//.test(route)
  ) return "hub";
  if (/^\/germany\/ja\/(?:community|jobs|eat|shopping|medical)\/$/.test(route)) return "directory";
  return "utility";
}

function bfs(graph, start) {
  const distance = new Map();
  if (!graph.has(start)) return distance;
  distance.set(start, 0);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const route = queue[index];
    for (const target of graph.get(route) || []) {
      if (distance.has(target)) continue;
      distance.set(target, distance.get(route) + 1);
      queue.push(target);
    }
  }
  return distance;
}

function duplicateValues(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

export function validateArtifactQuality({ siteDir, budget }) {
  const resolvedSite = path.resolve(siteDir);
  const errors = [];
  if (!fs.existsSync(resolvedSite)) {
    return { errors: [`Pages artifact does not exist: ${resolvedSite}`], metrics: null, pages: [] };
  }

  const htmlFiles = walkFiles(resolvedSite).filter((file) => file.endsWith(".html")).sort();
  const pages = htmlFiles.map((file) => {
    const html = fs.readFileSync(file, "utf8");
    const staticHtml = stripNonStaticMarkup(html);
    const route = toRoute(resolvedSite, file);
    const idValues = openingTags(staticHtml, "[a-z0-9:-]+")
      .map(({ attributes }) => attributes.get("id"))
      .filter(Boolean);
    return {
      route,
      file,
      html,
      staticHtml,
      ids: new Set(idValues),
      idValues,
      indexable: isIndexable(staticHtml),
      template: classifyTemplate(route, staticHtml),
      edges: new Set(),
      htmlBytes: Buffer.byteLength(html),
      cssBytes: 0,
      jsBytes: 0
    };
  });
  const pagesByRoute = new Map(pages.map((page) => [page.route, page]));
  const aliases = new Map();
  for (const page of pages) {
    aliases.set(page.route, page.route);
    if (page.route !== "/" && page.route.endsWith("/")) aliases.set(page.route.slice(0, -1), page.route);
  }

  for (const page of pages) {
    if (openingTags(page.staticHtml, "iframe").length) {
      errors.push(`${page.route}: iframe content is outside the automated accessibility audit scope`);
    }
    const duplicateIds = duplicateValues(page.idValues);
    if (duplicateIds.length) errors.push(`${page.route}: duplicate id values: ${duplicateIds.join(", ")}`);

    const referenceChecks = [];
    for (const { attributes } of openingTags(page.staticHtml, "[a-z0-9:-]+")) {
      for (const name of STATIC_REFERENCE_ATTRIBUTES) {
        const value = attributes.get(name);
        if (value) value.split(/\s+/).filter(Boolean).forEach((id) => referenceChecks.push([name, id]));
      }
      const tagFor = attributes.get("for");
      if (tagFor) referenceChecks.push(["for", tagFor]);
      const list = attributes.get("list");
      if (list) referenceChecks.push(["list", list]);
      const form = attributes.get("form");
      if (form) referenceChecks.push(["form", form]);
    }
    for (const [attribute, target] of referenceChecks) {
      if (!page.ids.has(target)) errors.push(`${page.route}: ${attribute} references missing id "${target}"`);
    }

    const h1s = [...page.staticHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)]
      .map((match) => textContent(match[1]))
      .filter(Boolean);
    if (h1s.length > 1) errors.push(`${page.route}: expected at most one meaningful h1, found ${h1s.length}`);
    if (page.indexable && h1s.length !== 1) errors.push(`${page.route}: indexable page must have exactly one meaningful h1`);
    if (!page.indexable && h1s.length === 0 && !NO_STATIC_H1_ALLOWLIST.has(page.route)) {
      errors.push(`${page.route}: noindex page has no meaningful static h1`);
    }

    if (page.route === "/" || page.route.startsWith("/germany/ja/")) {
      const hasSkipLink = openingTags(page.staticHtml, "a").some(({ attributes }) => attributes.get("href") === "#main-content");
      if (!hasSkipLink) errors.push(`${page.route}: missing skip link to #main-content`);
      if (!page.ids.has("main-content")) errors.push(`${page.route}: missing #main-content skip target`);
    }

    for (const { attributes } of openingTags(page.staticHtml, "img")) {
      const src = (attributes.get("src") || "").trim();
      if (!src) continue;
      if (!attributes.has("alt")) errors.push(`${page.route}: image is missing alt text (${src})`);
      const width = Number(attributes.get("width"));
      const height = Number(attributes.get("height"));
      if (!(width > 0) || !(height > 0)) errors.push(`${page.route}: image lacks intrinsic dimensions (${src})`);
    }

    for (const { attributes } of openingTags(page.staticHtml, "a")) {
      if (!attributes.has("href")) continue;
      const rawHref = attributes.get("href");
      const url = resolveUrl(rawHref, page.route);
      if (url === false) {
        errors.push(`${page.route}: malformed link URL "${rawHref}"`);
        continue;
      }
      if (!url || url.origin !== ORIGIN) continue;
      const targetFile = localFileForPath(resolvedSite, url.pathname);
      if (!targetFile) {
        errors.push(`${page.route}: broken internal target ${url.pathname}`);
        continue;
      }
      const targetRoute = canonicalTargetRoute(aliases, url.pathname);
      if (targetRoute) {
        page.edges.add(targetRoute);
        if (url.hash) {
          const fragment = safeDecodeFragment(url.hash.slice(1));
          if (fragment && !pagesByRoute.get(targetRoute).ids.has(fragment)) {
            errors.push(`${page.route}: broken fragment ${url.pathname}${url.hash}`);
          }
        }
      } else if (url.hash && targetFile.endsWith(".html")) {
        errors.push(`${page.route}: HTML target is not represented in the route graph (${url.pathname})`);
      }
    }

    const stylesheetUrls = [];
    for (const { attributes } of openingTags(page.html, "link")) {
      const rel = (attributes.get("rel") || "").toLowerCase().split(/\s+/);
      if (!rel.includes("stylesheet")) continue;
      const href = attributes.get("href") || "";
      const url = resolveUrl(href, page.route);
      if (url === false) {
        errors.push(`${page.route}: malformed stylesheet URL "${href}"`);
        continue;
      }
      if (!url) continue;
      if (url.origin !== ORIGIN) {
        errors.push(`${page.route}: render-blocking external stylesheet ${url.href}`);
        continue;
      }
      stylesheetUrls.push(url.pathname);
    }

    const scriptUrls = [];
    for (const { attributes } of openingTags(page.html, "script")) {
      const src = attributes.get("src");
      if (!src) continue;
      const url = resolveUrl(src, page.route);
      if (url === false) {
        errors.push(`${page.route}: malformed script URL "${src}"`);
        continue;
      }
      if (!url) continue;
      if (url.origin !== ORIGIN) {
        errors.push(`${page.route}: initial external script dependency ${url.href}`);
        continue;
      }
      scriptUrls.push(url.pathname);
    }

    for (const duplicate of duplicateValues(stylesheetUrls)) {
      errors.push(`${page.route}: duplicate stylesheet reference ${duplicate}`);
    }
    for (const duplicate of duplicateValues(scriptUrls)) {
      errors.push(`${page.route}: duplicate script reference ${duplicate}`);
    }

    for (const pathname of new Set(stylesheetUrls)) {
      const file = localFileForPath(resolvedSite, pathname);
      if (!file) errors.push(`${page.route}: missing local stylesheet ${pathname}`);
      else page.cssBytes += fs.statSync(file).size;
    }
    for (const pathname of new Set(scriptUrls)) {
      const file = localFileForPath(resolvedSite, pathname);
      if (!file) errors.push(`${page.route}: missing local script ${pathname}`);
      else page.jsBytes += fs.statSync(file).size;
    }

    const limits = budget.templates[page.template];
    if (!limits) {
      errors.push(`${page.route}: no artifact budget for template "${page.template}"`);
    } else {
      const shellBytes = page.htmlBytes + page.cssBytes + page.jsBytes;
      for (const [label, value, limit] of [
        ["HTML", page.htmlBytes, limits.html_bytes],
        ["CSS", page.cssBytes, limits.css_bytes],
        ["JavaScript", page.jsBytes, limits.js_bytes],
        ["shell", shellBytes, limits.shell_bytes]
      ]) {
        if (value > limit) errors.push(`${page.route}: ${label} budget exceeded (${formatBytes(value)} > ${formatBytes(limit)})`);
      }
    }
  }

  const graph = new Map(pages.map((page) => [page.route, page.edges]));
  const distanceFromRoot = bfs(graph, "/");
  for (const page of pages.filter((candidate) => candidate.indexable)) {
    if (!distanceFromRoot.has(page.route)) errors.push(`${page.route}: indexable route is unreachable from /`);
  }
  const maximumCrawlDepth = Math.max(0, ...pages.filter((page) => page.indexable).map((page) => distanceFromRoot.get(page.route) ?? 0));
  if (maximumCrawlDepth > budget.maximum_crawl_depth) {
    errors.push(`Maximum crawl depth exceeded (${maximumCrawlDepth} > ${budget.maximum_crawl_depth})`);
  }

  const sitemapPath = path.join(resolvedSite, "sitemap.xml");
  const sitemapRoutes = [];
  if (!fs.existsSync(sitemapPath)) {
    errors.push("sitemap.xml is missing from the Pages artifact");
  } else {
    const sitemap = fs.readFileSync(sitemapPath, "utf8");
    for (const match of sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
      const url = resolveUrl(match[1], "/");
      if (!url || url === false || url.origin !== ORIGIN) {
        errors.push(`sitemap.xml contains malformed or off-origin URL: ${match[1]}`);
        continue;
      }
      const route = canonicalTargetRoute(aliases, url.pathname);
      if (!route) {
        errors.push(`sitemap.xml target does not exist: ${url.pathname}`);
        continue;
      }
      sitemapRoutes.push(route);
      const page = pagesByRoute.get(route);
      if (!page.indexable) errors.push(`sitemap.xml contains noindex route: ${route}`);
      if (!distanceFromRoot.has(route)) errors.push(`sitemap.xml route is unreachable from /: ${route}`);
    }
    for (const duplicate of duplicateValues(sitemapRoutes)) errors.push(`sitemap.xml contains duplicate route: ${duplicate}`);
  }

  const templateMetrics = {};
  for (const page of pages) {
    const current = templateMetrics[page.template] || {
      pages: 0, max_html_bytes: 0, max_css_bytes: 0, max_js_bytes: 0, max_shell_bytes: 0
    };
    current.pages += 1;
    current.max_html_bytes = Math.max(current.max_html_bytes, page.htmlBytes);
    current.max_css_bytes = Math.max(current.max_css_bytes, page.cssBytes);
    current.max_js_bytes = Math.max(current.max_js_bytes, page.jsBytes);
    current.max_shell_bytes = Math.max(current.max_shell_bytes, page.htmlBytes + page.cssBytes + page.jsBytes);
    templateMetrics[page.template] = current;
  }

  return {
    errors: [...new Set(errors)].sort(),
    pages,
    metrics: {
      html_pages: pages.length,
      indexable_pages: pages.filter((page) => page.indexable).length,
      sitemap_routes: sitemapRoutes.length,
      maximum_crawl_depth: maximumCrawlDepth,
      external_initial_dependencies: pages.reduce((count, page) => (
        count
        + openingTags(page.html, "link").filter(({ attributes }) => {
          if (!(attributes.get("rel") || "").toLowerCase().includes("stylesheet")) return false;
          const url = resolveUrl(attributes.get("href"), page.route);
          return url && url !== false && url.origin !== ORIGIN;
        }).length
        + openingTags(page.html, "script").filter(({ attributes }) => {
          if (!attributes.get("src")) return false;
          const url = resolveUrl(attributes.get("src"), page.route);
          return url && url !== false && url.origin !== ORIGIN;
        }).length
      ), 0),
      templates: templateMetrics
    }
  };
}

export function renderArtifactQualitySummary(metrics) {
  const rows = Object.entries(metrics.templates)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `| ${name} | ${value.pages} | ${formatBytes(value.max_html_bytes)} | ${formatBytes(value.max_css_bytes)} | ${formatBytes(value.max_js_bytes)} | ${formatBytes(value.max_shell_bytes)} |`)
    .join("\n");
  return `## Pages artifact quality

- HTML pages: ${metrics.html_pages}
- Indexable pages: ${metrics.indexable_pages}
- Sitemap routes: ${metrics.sitemap_routes}
- Maximum crawl depth from \`/\`: ${metrics.maximum_crawl_depth}
- Initial third-party CSS/JS dependencies: ${metrics.external_initial_dependencies}

| Template | Pages | Max HTML | Max CSS | Max JS | Max shell |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows}
`;
}

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function main() {
  const siteDir = path.resolve(rootDir, argumentValue("--site-dir", "_site"));
  const budgetPath = path.resolve(rootDir, argumentValue("--budget", DEFAULT_BUDGET));
  const budget = JSON.parse(fs.readFileSync(budgetPath, "utf8"));
  const result = validateArtifactQuality({ siteDir, budget });
  if (result.metrics) {
    const summary = renderArtifactQualitySummary(result.metrics);
    process.stdout.write(`${summary}\n`);
    if (process.argv.includes("--github-summary") && process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
    }
  }
  if (result.errors.length) {
    process.stderr.write(`Artifact quality validation failed with ${result.errors.length} issue(s):\n`);
    result.errors.slice(0, 120).forEach((error) => process.stderr.write(`- ${error}\n`));
    if (result.errors.length > 120) process.stderr.write(`- …and ${result.errors.length - 120} more\n`);
    process.exit(1);
  }
  console.log("Artifact quality validation passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
