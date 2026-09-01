/**
 * Minimal stand-in for the content API, used only by CI so the frontend build
 * has something to render from without provisioning PostgreSQL.
 *
 * It serves the repository's seed fixture through the same endpoints the real
 * API exposes, which means a shape change in seed-data.json that would break
 * rendering still fails the build.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.STUB_PORT ?? "39399", 10);
const seedPath = fileURLToPath(new URL("../../api/src/seed-data.json", import.meta.url));
const seed = JSON.parse(await readFile(seedPath, "utf8"));

const isLive = href => {
  const value = String(href ?? "").trim();
  return value.length > 0 && value !== "#";
};

const content = {
  ...seed.settings,
  articles: seed.articles.map((row, index) => ({
    ...row, id: index + 1, href: `/notes/${row.slug}`,
  })),
  products: seed.products.map((row, index) => ({ ...row, id: index + 1 })),
  directory: {
    ...seed.settings.directory,
    links: seed.directoryLinks.map((row, index) => ({ ...row, id: index + 1 })),
  },
  socials: seed.socialLinks
    .map((row, index) => ({ ...row, id: index + 1 }))
    .filter(row => isLive(row.href)),
  pages: seed.pages.map(({ slug, title, description }) => ({ slug, title, description })),
};

const send = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");

  if (pathname === "/api/health") return send(response, 200, { status: "ok", version: "stub" });
  if (pathname === "/api/content") return send(response, 200, { data: content, meta: { source: "stub" } });

  const note = /^\/api\/notes\/(.+)$/.exec(pathname);
  if (note) {
    const article = content.articles.find(row => row.slug === decodeURIComponent(note[1]));
    return article
      ? send(response, 200, { data: { ...article, readingMinutes: 1 } })
      : send(response, 404, { error: "ARTICLE_NOT_FOUND" });
  }

  const page = /^\/api\/pages\/(.+)$/.exec(pathname);
  if (page) {
    const found = seed.pages.find(row => row.slug === decodeURIComponent(page[1]));
    return found ? send(response, 200, { data: found }) : send(response, 404, { error: "PAGE_NOT_FOUND" });
  }

  send(response, 404, { error: "NOT_FOUND" });
}).listen(port, "127.0.0.1", () => {
  console.log(`stub content API listening on http://127.0.0.1:${port}`);
});
