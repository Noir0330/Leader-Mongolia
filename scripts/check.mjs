import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPaths = ["index.html", "artists/index.html", "menu/index.html", "tickets/index.html", "history-2025/index.html"];
const htmlPages = await Promise.all(htmlPaths.map((htmlPath) => readFile(path.join(root, htmlPath), "utf8")));
const html = htmlPages[0];
const menuHtml = htmlPages[2];
const ticketsHtml = htmlPages[3];
const historyHtml = htmlPages[4];
const fontCssPath = path.join(root, "assets/css/fonts.css");
const fontCss = await readFile(fontCssPath, "utf8");
const localReferences = htmlPages.flatMap((page) => [...page.matchAll(/(?:content|data-src|href|src)="([^"]+)"/g)])
  .map((match) => match[1])
  .filter((reference) => reference.startsWith("/"));

const failures = [];

for (const reference of localReferences) {
  let relativePath = decodeURIComponent(reference.split(/[?#]/, 1)[0]).replace(/^\/+/, "");
  if (relativePath.endsWith("/")) relativePath += "index.html";

  try {
    await access(path.join(root, relativePath));
  } catch {
    failures.push(`Missing local asset: ${reference}`);
  }
}

for (const match of fontCss.matchAll(/url\(([^)]+)\)/g)) {
  const reference = match[1].replaceAll(/["']/g, "");

  try {
    await access(path.resolve(path.dirname(fontCssPath), reference));
  } catch {
    failures.push(`Missing local font: ${reference}`);
  }
}

for (const [index, page] of htmlPages.entries()) {
  if (!page.includes('lang="mn"')) failures.push(`${htmlPaths[index]} language is not Mongolian.`);
  if (!page.includes('src="/assets/js/snowflakes.min.js"')) failures.push(`${htmlPaths[index]} does not use the local snowflakes script.`);
  if (page.includes("unpkg.com/magic-snowflakes")) failures.push(`${htmlPaths[index]} still uses the snowflakes CDN.`);
}

if (!fontCss.includes("U+0400-045F") || !fontCss.includes("U+0460-052F")) {
  failures.push("Mongolian Cyrillic font coverage is missing.");
}

for (const copy of ["Leaders Mongolia", "Эрхэмсэг үдэш таныг урьж байна", "Шинэ оноо хамтдаа угтъя!"]) {
  if (!html.includes(copy)) failures.push(`Required invitation copy is missing: ${copy}`);
}

for (const ticketCopy of ["VVIP", "VIP", "Regular", "600,000₮", "500,000₮", "400,000₮", "12 · 26"]) {
  if (!ticketsHtml.includes(ticketCopy)) failures.push(`Required ticket copy is missing: ${ticketCopy}`);
}

for (const menuCopy of ["Таны үдшийн зоог", "Жимстэй шинэ ногооны", "BBQ соусаар амталсан", "Үхрийн махан филей", "Гүзээлзгэнэтэй бялуу", "Шингэн хүнс"]) {
  if (!menuHtml.includes(menuCopy)) failures.push(`Required menu copy is missing: ${menuCopy}`);
}

if (!historyHtml.includes("Leaders Mongolia 2025 History")) {
  failures.push("The 2025 history route title is missing.");
}

for (const [index, page] of htmlPages.entries()) {
  if (page.includes("<small>01</small>")) failures.push(`${htmlPaths[index]} still numbers its navigation items.`);
  if (!page.includes('href="/history-2025/"')) failures.push(`${htmlPaths[index]} is missing the 2025 history navigation link.`);
}

for (const eventCopy of ["2026-12-26T00:00:00+08:00", "2026 оны 12 сарын 26", "Хөтөлбөр", "Galaxy Event Hall"]) {
  if (!html.includes(eventCopy)) failures.push(`Preserved event content is missing: ${eventCopy}`);
}

for (const removedDemoCopy of ["+383"]) {
  if (html.includes(removedDemoCopy)) failures.push(`Old demo content is still present: ${removedDemoCopy}`);
}

if (html.includes("cloudflareinsights.com")) {
  failures.push("Third-party analytics beacon is still present.");
}

if (html.includes("﹖")) {
  failures.push("A SiteSucker query-character filename is still referenced.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Static checks passed (${localReferences.length} local references).`);
}
