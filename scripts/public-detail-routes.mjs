import path from "node:path";

const SAFE_PUBLIC_ID_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._'&-]{0,159}$/u;
const PRIVATE_IDENTIFIER_PATTERN = /(?:^|[._'&-])(?:manage|admin|internal|token|secret|password|email|spreadsheet|moderation)(?:[._'&-]|$)/i;

const ROUTES = Object.freeze({
  community: Object.freeze({ prefix: "/germany/ja/community/posts/" }),
  jobs: Object.freeze({ prefix: "/germany/ja/jobs/" })
});

function routeConfig(kind) {
  const config = ROUTES[kind];
  if (!config) throw new Error(`Unknown public detail kind: ${kind}`);
  return config;
}

export function encodePublicDetailId(value) {
  const id = String(value ?? "").trim().normalize("NFKC");
  if (!SAFE_PUBLIC_ID_PATTERN.test(id) || PRIVATE_IDENTIFIER_PATTERN.test(id)) {
    throw new Error("Public detail ID is missing or unsafe.");
  }
  return encodeURIComponent(id).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function publicDetailUrl(kind, id) {
  return `${routeConfig(kind).prefix}${encodePublicDetailId(id)}/`;
}

export function assertPublicDetailUrl(kind, value, id) {
  const expected = publicDetailUrl(kind, id);
  const route = String(value ?? "").trim();
  if (route !== expected || route.includes("?") || route.includes("#") || route.includes("\\")) {
    throw new Error(`${kind} detail_url must equal the deterministic route for its public ID.`);
  }
  return route;
}

export function publicDetailOutputPath(kind, value, id) {
  const route = assertPublicDetailUrl(kind, value, id);
  const relative = route.replace(/^\/+|\/+$/g, "");
  const segments = relative.split("/").map((segment) => decodeURIComponent(segment));
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || /[\\/]/.test(segment))) {
    throw new Error(`${kind} detail route contains an unsafe output segment.`);
  }
  const output = path.posix.join(...segments, "index.html");
  if (output.startsWith("../") || path.posix.isAbsolute(output) || !output.endsWith("/index.html")) {
    throw new Error(`${kind} detail route escapes the Pages artifact.`);
  }
  return output;
}

export const PUBLIC_DETAIL_ROUTES = ROUTES;
