import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".m4a", "audio/mp4"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

const server = createServer(async (request, response) => {
  const requestPath = new URL(request.url ?? "/", "http://localhost").pathname;
  const relativePath = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath).replace(/^\/+/, "");
  let filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    let details = await stat(filePath);

    if (details.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      details = await stat(filePath);
    }

    if (!details.isFile()) {
      throw new Error("Not a file");
    }

    const contentType = mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream";
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (range) {
      const suffixLength = range[1] === "" ? Number.parseInt(range[2], 10) : null;
      const start = suffixLength === null
        ? Number.parseInt(range[1], 10)
        : Math.max(0, details.size - suffixLength);
      const end = suffixLength === null && range[2] !== ""
        ? Math.min(Number.parseInt(range[2], 10), details.size - 1)
        : details.size - 1;

      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= details.size) {
        response.writeHead(416, { "Content-Range": `bytes */${details.size}` }).end();
        return;
      }

      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${details.size}`,
        "Content-Type": contentType,
      });
      createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Length": details.size,
      "Content-Type": contentType,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Invitation preview: http://127.0.0.1:${port}`);
});
