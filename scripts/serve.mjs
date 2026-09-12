import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".webp": "image/webp",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const route = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const relative = route === "/" ? "index.html" : route.slice(1);
      const base = relative.startsWith("assets/")
        ? path.join(root, "public")
        : root;
      const file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Daram Survivors: http://localhost:${port}`),
  );
