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
  [".mp3", "audio/mpeg"],
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

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Invitation preview: http://127.0.0.1:${port}`);
});
