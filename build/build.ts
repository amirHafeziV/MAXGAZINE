/**
 * Static-site build: turns content/articles/*.json into per-language HTML under
 * /<lang>/<slug>.html, regenerates per-language stories indexes, and writes
 * sitemap.xml covering the hand-built pages plus all generated pages.
 *
 * Run: tsx build/build.ts   (from agents/: npm run build)
 */
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { LANGS, REPO_ROOT, ARTICLES_DIR, config } from "../agents/src/config.js";
import type { Article } from "../agents/src/types.js";
import { renderArticle, renderStoriesIndex } from "./templates.js";

const ORIGIN = config.siteOrigin;

/** Hand-built top-level pages to include in the sitemap. */
const STATIC_PAGES = [
  "index.html", "stories.html", "prices.html", "exchanges.html",
  "brokers.html", "future.html", "chart.html", "about.html", "contact.html",
];

async function loadArticles(): Promise<Article[]> {
  let files: string[];
  try {
    files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const articles: Article[] = [];
  for (const f of files) {
    articles.push(JSON.parse(await readFile(join(ARTICLES_DIR, f), "utf8")) as Article);
  }
  return articles.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function sitemap(urls: Array<{ loc: string; lastmod?: string }>): string {
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

async function main() {
  const articles = await loadArticles();
  console.log(`[build] ${articles.length} article(s) found.`);

  const urls: Array<{ loc: string; lastmod?: string }> = [];
  for (const p of STATIC_PAGES) urls.push({ loc: `${ORIGIN}/${p === "index.html" ? "" : p}` });

  for (const lang of LANGS) {
    const dir = join(REPO_ROOT, lang);
    await mkdir(dir, { recursive: true });

    for (const article of articles) {
      const html = renderArticle(article, lang, ORIGIN);
      await writeFile(join(dir, `${article.slug}.html`), html, "utf8");
      urls.push({ loc: `${ORIGIN}/${lang}/${article.slug}.html`, lastmod: article.date });
    }

    const index = renderStoriesIndex(articles, lang, ORIGIN);
    await writeFile(join(dir, "stories.html"), index, "utf8");
    urls.push({ loc: `${ORIGIN}/${lang}/stories.html` });
  }

  await writeFile(join(REPO_ROOT, "sitemap.xml"), sitemap(urls), "utf8");
  console.log(`[build] wrote ${articles.length * LANGS.length} article pages, ${LANGS.length} indexes, sitemap.xml.`);
}

main().catch((err) => {
  console.error("[build] fatal:", err);
  process.exit(1);
});
