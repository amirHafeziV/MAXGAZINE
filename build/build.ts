/**
 * Static-site build: turns content/articles/*.json into per-language HTML under
 * /<lang>/<slug>.html, regenerates per-language stories indexes, and writes
 * sitemap.xml covering the hand-built pages plus all generated pages.
 *
 * Run: tsx build/build.ts   (from agents/: npm run build)
 */
import { mkdir, writeFile, readFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { LANGS, REPO_ROOT, ARTICLES_DIR, DATA_DIR, CONTENT_DIR, config } from "../agents/src/config.js";
import type { Article } from "../agents/src/types.js";
import { normalizeArticle } from "../agents/src/taxonomy.js";
import { renderArticle, renderStoriesIndex, renderCoinPage, type CoinContent } from "./templates.js";

const ORIGIN = config.siteOrigin;

/** Hand-built top-level pages to include in the sitemap. */
const STATIC_PAGES = [
  "index.html", "stories.html", "prices.html", "exchanges.html",
  "brokers.html", "future.html", "chart.html", "about.html", "contact.html",
];

const COINS_DIR = join(CONTENT_DIR, "coins");

/** Real content slugs never start with "_" or "." — exclude agent scratch/probe
 *  files (e.g. __writetest_*.json, __test_git_add.json) so they are never loaded
 *  as content or leaked into the panel index. */
const isContentJson = (f: string): boolean => f.endsWith(".json") && !/^[._]/.test(f);

async function loadCoins(): Promise<CoinContent[]> {
  let files: string[];
  try {
    files = (await readdir(COINS_DIR)).filter(isContentJson);
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
    files = (await readdir(ARTICLES_DIR)).filter(isContentJson);
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
    // backfill topic/type/placement from legacy category/featured
    articles.push(normalizeArticle(article));
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
    topic: a.topic,
    type: a.type,
    placement: a.placement,
    date: a.date,
    author: a.author,
    headline: a.headline,
    dek: a.dek,
    banner: a.banner ?? null,
    tags: Array.isArray(a.tags) ? a.tags.slice(0, 3) : [],
    // hero requires a banner; mirror to legacy `featured` for older consumers
    featured: a.placement?.hero === true && !!a.banner,
  };
}

/** Lightweight index of EVERY article — including drafts and scheduled ones —
 *  written for the MasterWriter panel so its list/dashboard loads in ONE request
 *  instead of one GitHub Contents fetch per file (the N+1 that made the panel
 *  crawl to load). Only summary fields the list needs; the full body + git sha
 *  are still fetched lazily by the panel when an article is opened to edit. */
async function buildPanelIndex(): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(ARTICLES_DIR)).filter(isContentJson);
  } catch {
    return;
  }
  const entries: Array<Record<string, unknown>> = [];
  for (const f of files) {
    let a: Article;
    try {
      a = JSON.parse(await readFile(join(ARTICLES_DIR, f), "utf8")) as Article;
    } catch {
      console.warn(`[build] panel index: skipping unparseable ${f}`);
      continue;
    }
    entries.push({
      file: f,
      slug: a.slug,
      // keep the ORIGINAL status so the panel's articleStatus() can still derive
      // "scheduled" from publishAt exactly as it does for live-fetched articles
      status: a.status ?? null,
      date: a.date,
      publishAt: a.publishAt ?? null,
      category: a.category ?? null,
      topic: a.topic ?? null,
      type: a.type ?? null,
      author: a.author ?? null,
      headline: a.headline,
      banner: a.banner ?? null,
      featured: a.placement?.hero === true || a.featured === true,
    });
  }
  entries.sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1));
  await writeFile(
    join(REPO_ROOT, "content", "data", "articles-index.json"),
    JSON.stringify(entries),
    "utf8",
  );
  console.log(`[build] wrote panel index: ${entries.length} article(s).`);
}

/** Rewrite the `# BEGIN coin-redirects` … `# END coin-redirects` block in
 *  .htaccess so every coin slug 301-redirects from its old root URL
 *  (/slug[.html]) to the English page (/en/slug.html). No-op if the markers
 *  are missing or the block is already current. */
async function syncCoinRedirects(slugs: string[]): Promise<void> {
  const path = join(REPO_ROOT, ".htaccess");
  let src: string;
  try {
    src = await readFile(path, "utf8");
  } catch {
    return;
  }
  const begin = "# BEGIN coin-redirects";
  const end = "# END coin-redirects";
  const bi = src.indexOf(begin);
  const ei = src.indexOf(end);
  if (bi === -1 || ei === -1 || ei < bi) return;

  const rule = slugs.length
    ? `RewriteRule ^(${slugs.join("|")})(\\.html)?$ /en/$1.html [R=301,L]\n`
    : "";
  const next = `${src.slice(0, bi + begin.length)}\n${rule}${src.slice(ei)}`;
  if (next !== src) {
    await writeFile(path, next, "utf8");
    console.log(`[build] synced ${slugs.length} coin redirect(s) in .htaccess.`);
  }
}

async function main() {
  const articles = await loadArticles();
  console.log(`[build] ${articles.length} article(s) found.`);

  await writeFile(
    join(REPO_ROOT, "content", "data", "feed.json"),
    JSON.stringify(articles.map(feedEntry)),
    "utf8",
  );

  await buildPanelIndex();

  const coins = await loadCoins();
  console.log(`[build] ${coins.length} coin page(s) found.`);

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

    // coin profile pages now live per-language alongside articles (/<lang>/<slug>.html)
    for (const coin of coins) {
      const html = renderCoinPage(coin, articles, lang, ORIGIN);
      await writeFile(join(dir, `${coin.slug}.html`), html, "utf8");
      urls.push({ loc: `${ORIGIN}/${lang}/${coin.slug}.html` });
    }

    const PER_PAGE = 12;
    const totalPages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
    for (let pg = 1; pg <= totalPages; pg++) {
      const html = renderStoriesIndex(articles, lang, ORIGIN, pg, PER_PAGE);
      const file = pg <= 1 ? "stories.html" : `stories-${pg}.html`;
      await writeFile(join(dir, file), html, "utf8");
      urls.push({ loc: `${ORIGIN}/${lang}/${file}` });
    }

    // prune stale pages (renamed or now-draft slugs) so they never linger live
    const valid = new Set<string>([
      ...articles.map((a) => `${a.slug}.html`),
      ...coins.map((c) => `${c.slug}.html`),
      ...Array.from({ length: totalPages }, (_, i) => (i === 0 ? "stories.html" : `stories-${i + 1}.html`)),
    ]);
    for (const f of await readdir(dir)) {
      if (f.endsWith(".html") && !valid.has(f)) await unlink(join(dir, f));
    }
  }

  // slug map consumed client-side (assets/app.js) to build language-aware
  // Trade-Now deep links: <lang>/<slug>.html
  const coinPages: Record<string, string> = {};
  for (const coin of coins) coinPages[coin.id] = coin.slug;

  // remove the old root-level coin pages (now superseded by /<lang>/<slug>.html)
  for (const coin of coins) {
    try { await unlink(join(REPO_ROOT, `${coin.slug}.html`)); } catch { /* already gone */ }
  }

  // keep the .htaccess 301 redirects (old root coin URLs -> /en/<slug>.html) in
  // sync with the live coin set, between the BEGIN/END coin-redirects markers
  await syncCoinRedirects(coins.map((c) => c.slug));

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, "coin-pages.json"), JSON.stringify(coinPages), "utf8");

  await writeFile(join(REPO_ROOT, "sitemap.xml"), sitemap(urls), "utf8");
  console.log(`[build] wrote ${articles.length * LANGS.length} article pages, ${coins.length * LANGS.length} coin pages, ${LANGS.length} indexes, sitemap.xml.`);
}

main().catch((err) => {
  console.error("[build] fatal:", err);
  process.exit(1);
});
