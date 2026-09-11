import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
http
  .createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Blanco-Preview", "1");
    if (request.url === "/__preview_health") {
      response.end("blanco-local-preview");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const path = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      if (
        path.split("/").some((p) => p.startsWith(".") && p !== ".local-preview")
      )
        throw new Error("Private path");
      let file = resolve(root, "." + (path === "/" ? "/admin.html" : path));
      if (!file.startsWith(root + sep)) throw new Error("Invalid path");
      if (!extname(file)) file += ".html";
      if (!(await stat(file)).isFile()) throw new Error("Not a file");
      response.setHeader(
        "Content-Type",
        types[extname(file)] || "application/octet-stream",
      );
      response.end(
        request.method === "HEAD" ? undefined : await readFile(file),
      );
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("Blanco preview: http://127.0.0.1:4173/admin.html"),
  );
