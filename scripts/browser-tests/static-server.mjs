import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = path.resolve(process.env.STATIC_ROOT || process.cwd());

const contentTypes = new Map([
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

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8"
  });
  response.end(body);
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
    sendText(response, 405, "Method not allowed");
    return;
  }

  try {
    const resolved = await resolveRequestPath(request.url);
    if (!resolved) {
      sendText(response, 404, "Not found");
      return;
    }

    const type = contentTypes.get(path.extname(resolved.filePath).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": resolved.fileStat.size,
      "content-type": type
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(resolved.filePath).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      sendText(response, 404, "Not found");
      return;
    }
    sendText(response, 500, "Internal server error");
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Static site server listening on http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
