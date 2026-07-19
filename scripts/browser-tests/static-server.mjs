import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = path.resolve(process.env.STATIC_ROOT || process.cwd());

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function sendText(response, statusCode, body, method = "GET") {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8"
  });
  response.end(method === "HEAD" ? undefined : body);
}

function sendFile(response, resolved, statusCode, method) {
  const type = contentTypes.get(path.extname(resolved.filePath).toLowerCase()) || "application/octet-stream";
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-length": resolved.fileStat.size,
    "content-type": type
  });

  if (method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(resolved.filePath).pipe(response);
}

async function sendNotFound(response, method) {
  try {
    const filePath = path.join(root, "404.html");
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      sendFile(response, { filePath, fileStat }, 404, method);
      return;
    }
  } catch {
    // Keep the local server useful for partial fixtures that intentionally omit
    // the production error document.
  }

  sendText(response, 404, "Not found", method);
}

async function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl || "/", `http://${host}:${port}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  let filePath = path.resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return null;

  let fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    fileStat = await stat(filePath);
  }

  return fileStat.isFile() ? { filePath, fileStat } : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed", request.method);
    return;
  }

  try {
    const resolved = await resolveRequestPath(request.url);
    if (!resolved) {
      await sendNotFound(response, request.method);
      return;
    }

    sendFile(response, resolved, 200, request.method);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      await sendNotFound(response, request.method);
      return;
    }
    sendText(response, 500, "Internal server error", request.method);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Static site server listening on http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
