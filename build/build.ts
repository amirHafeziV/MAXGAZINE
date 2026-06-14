/**
 * Static-site build: turns content/articles/*.json into per-language HTML under
 * /<lang>/<slug>.html, regenerates per-language stories indexes, and writes
 * sitemap.xml covering the hand-built pages plus all generated pages.
 *
 * Run: tsx build/build.ts   (from agents/: npm run build)
 */
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { LANGS, REPO_ROOT, ARTICLES_DIR, DATA_DIR, CONTENT_DIR, config } from "../agents/src/config.js";
import type { Article } from "../agents/src/types.js";
import { renderArticle, renderStoriesIndex, renderCoinPage, type CoinContent } from "./templates.js";

const ORIGIN = config.siteOrigin;

/** Hand-built top-level pages to include in the sitemap. */
const STATIC_PAGES = [
  "index.html", "stories.html", "prices.html", "exchanges.html",
  "brokers.html", "future.html", "chart.html", "about.html", "contact.html",
];

const COINS_DIR = join(CONTENT_DIR, "coins");

async function loadCoins(): Promise<CoinContent[]> {
  let files: string[];
  try {
    files = (await readdir(COINS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const coins: CoinContent[] = [];
  for (const f of files) {
    coins.push(JSON.parse(await readFile(join(COINS_DIR, f), "utf8")) as CoinContent);
  }
  return coins.sort((a, b) => a.rank - b.rank);
}

async function loadArticles(): Promise<Article[]> {
  let files: string[];
  try {
    files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const articles: Article[] = [];
  const now = Date.now();
  for (const f of files) {
    const article = JSON.parse(await readFile(join(ARTICLES_DIR, f), "utf8")) as Article;
    if (article.status === "draft") {
      console.log(`[build] skipping draft: ${article.slug}`);
      continue;
    }
    if (article.publishAt && Date.parse(article.publishAt) > now) {
      console.log(`[build] scheduled for ${article.publishAt}, skipping: ${article.slug}`);
      continue;
    }
    articles.push(article);
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

/** Lightweight per-article summary consumed client-side by assets/app.js for the
 *  homepage feed and the stories index (filtering, pagination). */
function feedEntry(a: Article) {
  return {
    slug: a.slug,
    category: a.category,
    date: a.date,
    author: a.author,
    headline: a.headline,
    dek: a.dek,
    banner: a.banner ?? null,
    featured: a.featured === true && !!a.banner,
  };
}

async function main() {
  const articles = await loadArticles();
  console.log(`[build] ${articles.length} article(s) found.`);

  await writeFile(
    join(REPO_ROOT, "content", "data", "feed.json"),
    JSON.stringify(articles.map(feedEntry)),
    "utf8",
  );

  const urls: Array<{ loc: string; lastmod?: string }> = [];
  for (const p of STATIC_PAGES) urls.push({ loc: `${ORIGIN}/${p === "index.html" ? "" : p}` });

  for (const lang of LANGS) {
    const dir = join(REPO_ROOT, lang);
    await mkdir(dir, { recursive: true });

    for (const article of articles) {
      const html = renderArticle(article, articles, lang, ORIGIN);
      await writeFile(join(dir, `${article.slug}.html`), html, "utf8");
      urls.push({ loc: `${ORIGIN}/${lang}/${article.slug}.html`, lastmod: article.date });
    }

    const index = renderStoriesIndex(articles, lang, ORIGIN);
    await writeFile(join(dir, "stories.html"), index, "utf8");
    urls.push({ loc: `${ORIGIN}/${lang}/stories.html` });
  }

  const coins = await loadCoins();
  console.log(`[build] ${coins.length} coin page(s) found.`);

  const coinPages: Record<string, string> = {};
  for (const coin of coins) {
    const html = renderCoinPage(coin, articles, ORIGIN);
    await writeFile(join(REPO_ROOT, `${coin.slug}.html`), html, "utf8");
    urls.push({ loc: `${ORIGIN}/${coin.slug}` });
    coinPages[coin.id] = coin.slug;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, "coin-pages.json"), JSON.stringify(coinPages), "utf8");

  await writeFile(join(REPO_ROOT, "sitemap.xml"), sitemap(urls), "utf8");
  console.log(`[build] wrote ${articles.length * LANGS.length} article pages, ${LANGS.length} indexes, ${coins.length} coin pages, sitemap.xml.`);
}

main().catch((err) => {
  console.error("[build] fatal:", err);
  process.exit(1);
});
