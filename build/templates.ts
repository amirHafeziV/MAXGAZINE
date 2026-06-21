import { LANGS, RTL_LANGS, OG_LOCALE, LANG_NAMES, type Lang } from "../agents/src/config.js";
import type { Article, Localized } from "../agents/src/types.js";

/** Chrome strings, mirrored from assets/i18n.js (window.I). Keep in sync. */
const CHROME: Record<Lang, Record<string, string>> = {
  en: {
    nav_stories: "Stories", nav_prices: "Prices", nav_exchanges: "Exchanges",
    nav_brokers: "Brokers", nav_future: "Future", nav_soon: "Coming Soon", nav_about: "About",
    nav_crypto: "Crypto", nav_forex: "Forex", nav_tech: "Tech", nav_cars: "Cars",
    nav_analysis: "Market Analysis", nav_topmarkets: "Markets", nav_contact: "Contact", m_close: "Close",
    foot_explore: "Explore", foot_markets: "Markets", foot_company: "Company", foot_lang: "Languages",
    foot_desc: "Maxgazine is a multilingual market media outlet covering crypto, forex, tech and cars — fast, raw, and without the noise.",
    f_stories: "Stories", f_chart: "Chart", f_prices: "Prices",
    f_exchanges: "Top Exchanges", f_brokers: "Top Brokers", f_about: "About Us", f_contact: "Contact Us",
    f_copy: "© 2026 MAXGAZINE — CRYPTO · FOREX · TECH · CARS", f_built: "MULTILINGUAL MARKET MEDIA",
    stories_title: "Stories", read_more: "Read →", sources: "Sources", published: "Published",
    related: "Related Stories",
  },
  fa: {
    nav_stories: "مطالب", nav_prices: "قیمت‌ها", nav_exchanges: "صرافی‌ها",
    nav_brokers: "بروکرها", nav_future: "آینده", nav_soon: "به زودی", nav_about: "درباره",
    nav_crypto: "کریپتو", nav_forex: "فارکس", nav_tech: "تکنولوژی", nav_cars: "خودرو",
    nav_analysis: "تحلیل بازار", nav_topmarkets: "بازارها", nav_contact: "تماس", m_close: "بستن",
    foot_explore: "کاوش", foot_markets: "بازارها", foot_company: "شرکت", foot_lang: "زبان‌ها",
    foot_desc: "Maxgazine رسانه‌ای چندزبانه در حوزه بازار است که اخبار کریپتو، فارکس، تکنولوژی و خودرو را سریع، خام و بدون شلوغی پوشش می‌دهد.",
    f_stories: "مطالب", f_chart: "نمودار", f_prices: "قیمت‌ها",
    f_exchanges: "برترین صرافی‌ها", f_brokers: "برترین بروکرها", f_about: "درباره ما", f_contact: "تماس با ما",
    f_copy: "© ۲۰۲۶ MAXGAZINE — کریپتو · فارکس · تکنولوژی · خودرو", f_built: "رسانه چندزبانه بازار",
    stories_title: "مطالب", read_more: "خواندن ←", sources: "منابع", published: "انتشار",
    related: "مطالب مرتبط",
  },
  ar: {
    nav_stories: "المقالات", nav_prices: "الأسعار", nav_exchanges: "المنصّات",
    nav_brokers: "الوسطاء", nav_future: "المستقبل", nav_soon: "قريباً", nav_about: "حول",
    nav_crypto: "كريبتو", nav_forex: "فوركس", nav_tech: "تقنية", nav_cars: "سيارات",
    nav_analysis: "تحليل السوق", nav_topmarkets: "الأسواق", nav_contact: "تواصل", m_close: "إغلاق",
    foot_explore: "استكشف", foot_markets: "الأسواق", foot_company: "الشركة", foot_lang: "اللغات",
    foot_desc: "Maxgazine منصة إعلامية متعددة اللغات تغطي أسواق الكريبتو والفوركس والتقنية والسيارات بسرعة وبصدق وبلا ضجيج.",
    f_stories: "المقالات", f_chart: "الرسم البياني", f_prices: "الأسعار",
    f_exchanges: "أفضل المنصّات", f_brokers: "أفضل الوسطاء", f_about: "حول", f_contact: "تواصل معنا",
    f_copy: "© ٢٠٢٦ MAXGAZINE — كريبتو · فوركس · تقنية · سيارات", f_built: "إعلام أسواق متعدد اللغات",
    stories_title: "المقالات", read_more: "اقرأ ←", sources: "المصادر", published: "نُشر",
    related: "مقالات ذات صلة",
  },
  tr: {
    nav_stories: "Haberler", nav_prices: "Fiyatlar", nav_exchanges: "Borsalar",
    nav_brokers: "Aracılar", nav_future: "Gelecek", nav_soon: "Yakında", nav_about: "Hakkında",
    nav_crypto: "Kripto", nav_forex: "Forex", nav_tech: "Teknoloji", nav_cars: "Otomobil",
    nav_analysis: "Piyasa Analizi", nav_topmarkets: "Piyasalar", nav_contact: "İletişim", m_close: "Kapat",
    foot_explore: "Keşfet", foot_markets: "Piyasalar", foot_company: "Şirket", foot_lang: "Diller",
    foot_desc: "Maxgazine; kripto, forex, teknoloji ve otomobil haberlerini hızlı, sade ve gürültüsüz biçimde sunan çok dilli bir piyasa medyasıdır.",
    f_stories: "Haberler", f_chart: "Grafik", f_prices: "Fiyatlar",
    f_exchanges: "En İyi Borsalar", f_brokers: "En İyi Aracılar", f_about: "Hakkımızda", f_contact: "İletişim",
    f_copy: "© 2026 MAXGAZINE — KRİPTO · FOREX · TEKNOLOJİ · OTOMOBİL", f_built: "ÇOK DİLLİ PİYASA MEDYASI",
    stories_title: "Haberler", read_more: "Oku →", sources: "Kaynaklar", published: "Yayımlandı",
    related: "İlgili Haberler",
  },
};

const FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=Estedad:wght@400;500;700;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

/**
 * Pick a localized value with fallback (manual panel articles may only be
 * written in one language): requested lang → en → first available → "".
 */
export function pick(loc: Partial<Record<Lang, string>> | undefined, lang: Lang): string {
  if (!loc) return "";
  return loc[lang] ?? loc.en ?? Object.values(loc).find(Boolean) ?? "";
}

/** Strip <script> blocks and inline event handlers from trusted-author HTML. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function langSuffix(lang: Lang): string {
  return lang === "en" ? "" : `?lang=${lang}`;
}

/** Minimal, safe Markdown → HTML (paragraphs, ##/###, bold, italic, links, lists,
 *  images, galleries). An image on its own line — `![alt](path)` — becomes a full-width
 *  figure; wrap several of them between `:::gallery` and `:::` lines for a 2-up grid.
 *  `prefix` is prepended to repo-relative image paths (article pages live in /<lang>/). */
export function md(src: string, prefix = ""): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  let inGallery = false;
  const inline = (t: string) =>
    esc(t)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const imgSrc = (s: string) => (s.startsWith("http") ? s : `${prefix}${s.replace(/^\/+/, "")}`);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (line === ":::gallery") { closeList(); out.push('<div class="article-gallery">'); inGallery = true; }
    else if (line === ":::" && inGallery) { out.push("</div>"); inGallery = false; }
    else if (img) {
      closeList();
      const tag = `<img src="${esc(imgSrc(img[2]!))}" alt="${esc(img[1]!)}" loading="lazy">`;
      out.push(inGallery ? `<figure>${tag}</figure>` : `<figure class="article-figure">${tag}</figure>`);
    }
    else if (line.startsWith("### ")) { closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (line.startsWith("## ")) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  if (inGallery) out.push("</div>");
  return out.join("\n");
}

interface PageOpts {
  lang: Lang;
  title: string;
  description: string;
  /** Absolute canonical URL. */
  canonical: string;
  /** lang -> absolute URL for hreflang alternates. */
  alternates: Record<Lang, string>;
  jsonLd: object;
  /** Relative prefix back to repo root, e.g. "../". */
  prefix: string;
  bodyHtml: string;
  /** Absolute og:image URL; falls back to the site default. */
  ogImage?: string;
  /** Pagination rel links (absolute URLs) for paginated indexes. */
  relPrev?: string;
  relNext?: string;
}

function head(o: PageOpts): string {
  const alts = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${o.alternates[l]}">`,
  ).join("\n");
  return `<!DOCTYPE html>
<html lang="${o.lang}" dir="${RTL_LANGS.includes(o.lang) ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0a0a">
<link rel="canonical" href="${o.canonical}">
${o.relPrev ? `<link rel="prev" href="${o.relPrev}">` : ""}
${o.relNext ? `<link rel="next" href="${o.relNext}">` : ""}
${alts}
<link rel="alternate" hreflang="x-default" href="${o.alternates.en}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="MAXGAZINE">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${o.canonical}">
<meta property="og:locale" content="${OG_LOCALE[o.lang]}">
<meta property="og:image" content="${esc(o.ogImage || "https://maxgazine.com/og-image.png")}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="${o.prefix}assets/styles.css">
<script type="application/ld+json">
${JSON.stringify(o.jsonLd)}
</script>
</head>`;
}

function chromeHeader(lang: Lang, prefix: string): string {
  const c = CHROME[lang];
  const s = langSuffix(lang);
  const p = (href: string) => `${prefix}${href}${s}`;
  const langBtns = LANGS.map(
    (l) => `<button data-lang="${l}"${l === lang ? ' class="active"' : ""} lang="${l}">${l.toUpperCase()}</button>`,
  ).join("");
  return `<body dir="${RTL_LANGS.includes(lang) ? "rtl" : "ltr"}" class="bs-page">
<div class="bs-frame">
<header class="bsheet">
  <div class="bs-top">
    <div class="bs-date" id="bs-date"></div>
    <div class="bs-cats">CRYPTO · FOREX · TECH · CARS</div>
    <div class="bs-lang" role="group" aria-label="Select language">${langBtns}</div>
  </div>
  <div class="bs-logo-row"><a class="bs-logo" href="${p("index.html")}" aria-label="MAXGAZINE — home">MAXGAZINE<span class="dot">.</span></a></div>
  <nav class="bs-nav" aria-label="Primary">
    <a href="${p("stories.html")}">${esc(c.nav_stories!)}</a>
    <a href="${p("exchanges.html")}">${esc(c.nav_topmarkets!)}</a>
    <a href="${p("prices.html")}">${esc(c.nav_prices!)}</a>
    <a href="${p("about.html")}">${esc(c.nav_about!)}</a>
    <a href="${p("contact.html")}">${esc(c.nav_contact!)}</a>
  </nav>
</header>
<div class="ticker" aria-label="Live prices"><div class="ticker-track" id="ticker">
  <span>BTC <span class="up">$94,210 ▲ 2.40%</span></span><span>ETH <span class="up">$3,180 ▲ 1.10%</span></span><span>EUR/USD <span class="up">1.0850 ▲ 0.12%</span></span>
  <span>BTC <span class="up">$94,210 ▲ 2.40%</span></span><span>ETH <span class="up">$3,180 ▲ 1.10%</span></span><span>EUR/USD <span class="up">1.0850 ▲ 0.12%</span></span>
</div></div>`;
}

function chromeFooter(lang: Lang, prefix: string): string {
  const c = CHROME[lang];
  const s = langSuffix(lang);
  const langLinks = LANGS.map(
    (l) => `<a href="#" data-lang="${l}">${LANG_NAMES[l]}</a>`,
  ).join("");
  return `<footer><div class="wrap">
  <div class="foot-top">
    <div class="foot-brand">
      <div class="foot-logo">MAXGAZINE<span class="dot">.</span></div>
      <p class="foot-desc">${esc(c.foot_desc!)}</p>
      <div class="foot-socials"><a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="X">X</a><a href="#" aria-label="YouTube">YT</a></div>
    </div>
    <div class="foot-cols">
      <div class="foot-col"><h5>${esc(c.foot_explore!)}</h5><a href="${prefix}stories.html${s}">${esc(c.f_stories!)}</a><a href="${prefix}chart.html${s}">${esc(c.f_chart!)}</a><a href="${prefix}prices.html${s}">${esc(c.f_prices!)}</a></div>
      <div class="foot-col"><h5>${esc(c.foot_markets!)}</h5><a href="${prefix}exchanges.html${s}">${esc(c.f_exchanges!)}</a><a href="${prefix}brokers.html${s}">${esc(c.f_brokers!)}</a></div>
      <div class="foot-col"><h5>${esc(c.foot_company!)}</h5><a href="${prefix}about.html${s}">${esc(c.f_about!)}</a><a href="${prefix}contact.html${s}">${esc(c.f_contact!)}</a></div>
      <div class="foot-col"><h5>${esc(c.foot_lang!)}</h5>${langLinks}</div>
    </div>
  </div>
  <div class="foot-bottom mono"><span>${esc(c.f_copy!)}</span><span>${esc(c.f_built!)}</span></div>
</div></footer>
</div><!-- /.bs-frame -->

<script src="${prefix}assets/i18n.js"></script>
<script src="${prefix}assets/app.js"></script>
</body>
</html>`;
}

/** Render one story card (used by the stories index and the related-stories section). */
function articleCard(a: Article, lang: Lang, prefix: string, readMore: string): string {
  const img = a.banner
    ? `<span class="card-img"><img src="${esc(a.banner.startsWith("http") ? a.banner : `${prefix}${a.banner.replace(/^\/+/, "")}`)}" alt="" loading="lazy"></span>
      `
    : "";
  return `    <a class="card${a.banner ? " has-img" : ""}" href="${prefix}${lang}/${a.slug}.html">
      ${img}<div class="cat mono">${esc(a.category.toUpperCase())} · ${esc(a.date)}</div>
      <h3>${esc(pick(a.headline, lang))}</h3>
      <p>${esc(pick(a.dek, lang))}</p>
      <span class="mono">${esc(readMore)}</span>
    </a>`;
}

/** Full article page for one language. */
export function renderArticle(
  article: Article,
  allArticles: Article[],
  lang: Lang,
  origin: string,
): string {
  const c = CHROME[lang];
  const prefix = "../";
  const alternates = Object.fromEntries(
    LANGS.map((l) => [l, `${origin}/${l}/${article.slug}.html`]),
  ) as Record<Lang, string>;
  const canonical = alternates[lang];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: pick(article.headline, lang),
    description: pick(article.dek, lang),
    ...(article.tags?.length ? { keywords: article.tags.join(", ") } : {}),
    ...(article.banner ? { image: article.banner.startsWith("http") ? article.banner : `${origin}/${article.banner.replace(/^\/+/, "")}` } : {}),
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: lang,
    author: { "@type": "Organization", name: "MAXGAZINE", url: `${origin}/` },
    publisher: {
      "@type": "Organization",
      name: "MAXGAZINE",
      logo: { "@type": "ImageObject", url: `${origin}/og-image.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    articleSection: article.category,
    citation: article.sources.map((src) => ({
      "@type": "CreativeWork",
      name: src.title,
      url: src.url,
    })),
  };

  const sourcesHtml = article.sources.length
    ? `<div class="section"><h2>${esc(c.sources!)}</h2><ul>${article.sources
        .map((src) => `<li><a href="${esc(src.url)}" rel="noopener nofollow">${esc(src.title)}</a></li>`)
        .join("")}</ul></div>`
    : "";

  const bannerHtml = article.banner
    ? `<figure class="lead-figure"><div class="lead-frame"><img src="${esc(article.banner.startsWith("http") ? article.banner : `${prefix}${article.banner.replace(/^\/+/, "")}`)}" alt="${esc(pick(article.headline, lang))}"></div></figure>`
    : "";
  const tagsHtml = article.tags?.length
    ? `<div class="read-tags">${article.tags
        .map((t) => `<span class="chip">${esc(t)}</span>`)
        .join("")}</div>`
    : "";
  // Per language: rich HTML wins over Markdown; fall back across languages.
  const richHtml = article.bodyHtml?.[lang] ?? (article.body?.[lang] ? undefined : pick(article.bodyHtml, lang) || undefined);

  // Related: other published articles sharing a category or tag, newest first.
  const related = allArticles
    .filter((a) => a.slug !== article.slug)
    .map((a) => ({
      article: a,
      score: (a.category === article.category ? 1 : 0) +
        (a.tags?.filter((t) => article.tags?.includes(t)).length ?? 0),
    }))
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score || (x.article.date < y.article.date ? 1 : -1))
    .slice(0, 3)
    .map((r) => r.article);

  const relatedHtml = related.length
    ? `<div class="section-head"><h2>${esc(c.related!)}</h2></div>
<div class="feed-grid bs-grid">
${related.map((a) => articleCard(a, lang, prefix, c.read_more!)).join("\n")}
</div>`
    : "";

  const body = `<main>
<article class="article-read bs-section">
  <div class="read-kicker">${esc(article.category.toUpperCase())}</div>
  <h1>${esc(pick(article.headline, lang))}</h1>
  <p class="read-dek">${esc(pick(article.dek, lang))}</p>
  <div class="read-byline">
    <span class="read-avatar" aria-hidden="true"></span>
    <span class="by-meta">${esc(c.published!)} <b>${esc(article.author)}</b> · ${esc(article.date)}</span>
  </div>
  ${bannerHtml}
  <div class="article-prose">
${richHtml ? sanitizeHtml(richHtml) : md(pick(article.body, lang), prefix)}
  </div>
  ${tagsHtml}
  ${sourcesHtml}
</article>
${relatedHtml ? `<div class="bs-section" style="padding-top:0">${relatedHtml}</div>` : ""}
</main>`;

  return [
    head({
      lang,
      title: pick(article.seo.title, lang),
      description: pick(article.seo.description, lang),
      canonical,
      alternates,
      jsonLd,
      prefix,
      bodyHtml: body,
      ogImage: article.banner
        ? article.banner.startsWith("http")
          ? article.banner
          : `${origin}/${article.banner.replace(/^\/+/, "")}`
        : undefined,
    }),
    chromeHeader(lang, prefix),
    body,
    chromeFooter(lang, prefix),
  ].join("\n");
}

/** Per-language stories index listing the given articles (newest first). */
export function renderStoriesIndex(
  articles: Article[],
  lang: Lang,
  origin: string,
  page = 1,
  perPage = 12,
): string {
  const c = CHROME[lang];
  const prefix = "../";
  const totalPages = Math.max(1, Math.ceil(articles.length / perPage));
  const cur = Math.min(Math.max(1, page), totalPages);
  const pageFile = (n: number) => (n <= 1 ? "stories.html" : `stories-${n}.html`);
  const pageUrl = (n: number) => `${origin}/${lang}/${pageFile(n)}`;
  const alternates = Object.fromEntries(
    LANGS.map((l) => [l, `${origin}/${l}/${pageFile(cur)}`]),
  ) as Record<Lang, string>;
  const canonical = pageUrl(cur);
  const slice = articles.slice((cur - 1) * perPage, cur * perPage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${c.stories_title}${cur > 1 ? ` — ${cur}` : ""}`,
    url: canonical,
    inLanguage: lang,
    hasPart: slice.map((a) => ({
      "@type": "NewsArticle",
      headline: pick(a.headline, lang),
      url: `${origin}/${lang}/${a.slug}.html`,
      datePublished: a.date,
    })),
  };

  const cards = slice.map((a) => articleCard(a, lang, prefix, c.read_more!)).join("\n");

  let pager = "";
  if (totalPages > 1) {
    const link = (n: number, label: string, cls = "") =>
      `<a href="${prefix}${lang}/${pageFile(n)}"${cls ? ` class="${cls}"` : ""}>${label}</a>`;
    const span = (label: string, cls: string) => `<span class="${cls}">${label}</span>`;
    const parts: string[] = [];
    parts.push(cur > 1 ? link(cur - 1, "←") : span("←", "disabled"));
    for (let n = 1; n <= totalPages; n++) {
      parts.push(n === cur ? span(String(n), "active") : link(n, String(n)));
    }
    parts.push(cur < totalPages ? link(cur + 1, "→") : span("→", "disabled"));
    pager = `\n<nav class="pager" aria-label="Pagination">${parts.join("")}</nav>`;
  }

  const body = `<main>
<div class="bs-pagehead"><h1>${esc(c.stories_title!)}</h1></div>
<div class="feed-grid bs-grid">
${cards || `    <p style="padding:34px 28px">No stories yet.</p>`}
</div>${pager}
</main>`;

  return [
    head({
      lang,
      title: `${c.stories_title}${cur > 1 ? ` — ${cur}` : ""} — MAXGAZINE`,
      description: "Latest crypto, forex, tech and cars stories from MAXGAZINE.",
      canonical,
      alternates,
      jsonLd,
      prefix,
      bodyHtml: body,
      relPrev: cur > 1 ? pageUrl(cur - 1) : undefined,
      relNext: cur < totalPages ? pageUrl(cur + 1) : undefined,
    }),
    chromeHeader(lang, prefix),
    body,
    chromeFooter(lang, prefix),
  ].join("\n");
}

/* ============================================================
   coin profile pages — root-level, single multilingual page
   per coin (e.g. /bitcoin-btc), language switched client-side
   via assets/i18n.js (?lang= + data-lang-block)
   ============================================================ */

/** Per-coin SEO/content payload, read from content/coins/<slug>.json. */
export interface CoinContent {
  id: string;
  symbol: string;
  name: string;
  slug: string;
  rank: number;
  /** Lowercase keywords matched against article.tags for the news section. */
  tags: string[];
  seo: { title: Localized; description: Localized };
  /** <h1> on the page, e.g. "Bitcoin (BTC) Price, Chart & News". */
  h1: Localized;
  /** One-line subtitle under the <h1>. */
  intro: Localized;
  sections: {
    about: Localized;
    history: Localized;
    story: Localized;
  };
}

const TICKER_PLACEHOLDER = `<div class="ticker" aria-label="Live prices"><div class="ticker-track" id="ticker">
  <span>BTC <span class="up">$94,210 ▲ 2.40%</span></span><span>ETH <span class="up">$3,180 ▲ 1.10%</span></span><span>EUR/USD <span class="up">1.0850 ▲ 0.12%</span></span>
  <span>BTC <span class="up">$94,210 ▲ 2.40%</span></span><span>ETH <span class="up">$3,180 ▲ 1.10%</span></span><span>EUR/USD <span class="up">1.0850 ▲ 0.12%</span></span>
</div></div>`;

/** Full primary navigation + mobile menu, identical to the hand-built root pages (prices.html etc). */
function rootHeader(): string {
  return `<div class="bs-frame">
<header class="bsheet">
  <div class="bs-top">
    <div class="bs-date" id="bs-date"></div>
    <div class="bs-cats" data-i="kicker">CRYPTO · FOREX · TECH · CARS</div>
    <div class="bs-lang" role="group" aria-label="Select language">
      <button data-lang="en" class="active" lang="en">EN</button>
      <button data-lang="fa" lang="fa">FA</button>
      <button data-lang="ar" lang="ar">AR</button>
      <button data-lang="tr" lang="tr">TR</button>
    </div>
  </div>
  <div class="bs-logo-row"><a class="bs-logo" href="index.html" aria-label="MAXGAZINE — home">MAXGAZINE<span class="dot">.</span></a></div>
  <nav class="bs-nav" aria-label="Primary">
    <a href="stories.html" data-i="nav_stories">Stories</a>
    <a href="exchanges.html" data-i="nav_topmarkets">Markets</a>
    <a href="prices.html" data-i="nav_prices">Prices</a>
    <a href="about.html" data-i="nav_about">About</a>
    <a href="contact.html" data-i="nav_contact">Contact</a>
  </nav>
</header>`;
}

function rootFooter(): string {
  return `<footer><div class="wrap">
  <div class="foot-top">
    <div class="foot-brand">
        <div class="foot-logo">MAXGAZINE<span class="dot">.</span></div>
      <p class="foot-desc" data-i="foot_desc">Maxgazine is a multilingual market media outlet covering crypto, forex, tech and cars — fast, raw, and without the noise.</p>
        <div class="foot-socials"><a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="X">X</a><a href="#" aria-label="YouTube">YT</a></div>
      </div>
    <div class="foot-cols">
      <div class="foot-col"><h5 data-i="foot_explore">Explore</h5><a href="stories.html" data-i="f_stories">Stories</a><a href="chart.html" data-i="f_chart">Chart</a><a href="prices.html" data-i="f_prices">Prices</a></div>
      <div class="foot-col"><h5 data-i="foot_markets">Markets</h5><a href="exchanges.html" data-i="f_exchanges">Top Exchanges</a><a href="brokers.html" data-i="f_brokers">Top Brokers</a></div>
      <div class="foot-col"><h5 data-i="foot_company">Company</h5><a href="about.html" data-i="f_about">About Us</a><a href="contact.html" data-i="f_contact">Contact Us</a></div>
      <div class="foot-col"><h5 data-i="foot_lang">Languages</h5><a href="#" data-lang="en">English</a><a href="#" data-lang="fa">فارسی</a><a href="#" data-lang="ar">العربية</a><a href="#" data-lang="tr">Türkçe</a></div>
    </div>
  </div>
  <div class="foot-bottom mono"><span data-i="f_copy">© 2026 MAXGAZINE — CRYPTO · FOREX · TECH · CARS</span><span data-i="f_built">MULTILINGUAL MARKET MEDIA</span></div>
</div></footer>
</div><!-- /.bs-frame -->`;
}

/** One related-story card, language-specific (links into /<lang>/<slug>.html). */
function coinNewsCard(a: Article, lang: Lang): string {
  return `<a class="card" href="${lang}/${a.slug}.html">
      <div class="cat mono">${esc(a.category.toUpperCase())} · ${esc(a.date)}</div>
      <h3>${esc(pick(a.headline, lang))}</h3>
      <p>${esc(pick(a.dek, lang))}</p>
    </a>`;
}

/** Compact related-story row for the coin-page sidebar (no dek, no image). */
function coinNewsSideCard(a: Article, lang: Lang): string {
  return `<a class="side-news-item" href="${lang}/${a.slug}.html">
      <span class="cat mono">${esc(a.category.toUpperCase())}</span>
      <h4>${esc(pick(a.headline, lang))}</h4>
    </a>`;
}

/** Render the four-language blocks for one prose section (about/history/story). */
function langProseBlocks(content: Localized): string {
  return LANGS.map(
    (l) =>
      `<div class="prose" data-lang-block="${l}"${l === "en" ? "" : " hidden"}>\n${md(pick(content, l))}\n</div>`,
  ).join("\n");
}

/** Generic "how to buy" steps shown on every coin page (language-independent of the coin itself). */
const HOWTO_STEPS: Array<{ title: Localized; body: Localized }> = [
  {
    title: { en: "Pick a Trusted Exchange", fa: "انتخاب صرافی معتبر", ar: "اختر منصة موثوقة", tr: "Güvenilir Bir Borsa Seçin" },
    body: {
      en: "Compare fees, security track record and supported pairs, then create an account with a reputable exchange.",
      fa: "کارمزدها، سابقه امنیتی و جفت‌ارزهای موجود را مقایسه کنید و در یک صرافی معتبر حساب باز کنید.",
      ar: "قارن الرسوم وسجل الأمان والأزواج المتاحة، ثم أنشئ حسابًا في منصة موثوقة.",
      tr: "Ücretleri, güvenlik geçmişini ve desteklenen çiftleri karşılaştırın, ardından güvenilir bir borsada hesap açın.",
    },
  },
  {
    title: { en: "Verify Your Identity", fa: "احراز هویت", ar: "وثّق هويتك", tr: "Kimliğinizi Doğrulayın" },
    body: {
      en: "Complete identity verification (KYC) so you can deposit funds and trade without limits.",
      fa: "مراحل احراز هویت (KYC) را تکمیل کنید تا بتوانید بدون محدودیت واریز و معامله انجام دهید.",
      ar: "أكمل إجراءات التحقق من الهوية (KYC) لتتمكن من الإيداع والتداول دون قيود.",
      tr: "Sınırsız yatırma ve işlem yapabilmek için kimlik doğrulamasını (KYC) tamamlayın.",
    },
  },
  {
    title: { en: "Deposit Funds", fa: "واریز وجه", ar: "أودع الأموال", tr: "Para Yatırın" },
    body: {
      en: "Fund your account using a bank transfer, card payment, or an existing crypto balance.",
      fa: "حساب خود را از طریق انتقال بانکی، کارت یا موجودی کریپتویی فعلی شارژ کنید.",
      ar: "موّل حسابك عبر تحويل بنكي أو دفع بالبطاقة أو رصيد كريبتو حالي.",
      tr: "Hesabınızı banka havalesi, kart ödemesi veya mevcut kripto bakiyenizle fonlayın.",
    },
  },
  {
    title: { en: "Buy & Store Safely", fa: "خرید و نگهداری امن", ar: "اشترِ واحفظ بأمان", tr: "Satın Alın ve Güvenle Saklayın" },
    body: {
      en: "Place your order, then move your coins to a secure wallet for long-term storage.",
      fa: "سفارش خود را ثبت کنید، سپس دارایی را برای نگهداری بلندمدت به یک کیف‌پول امن منتقل نمایید.",
      ar: "نفّذ طلبك، ثم انقل عملاتك إلى محفظة آمنة للتخزين طويل الأمد.",
      tr: "Emrinizi verin, ardından varlıklarınızı uzun süreli saklama için güvenli bir cüzdana taşıyın.",
    },
  },
];

/** "How to buy {SYMBOL}" heading, phrased naturally per language. */
function howtoTitle(l: Lang, symbol: string): string {
  switch (l) {
    case "fa": return `راهنمای خرید ${symbol}`;
    case "ar": return `كيفية شراء ${symbol}`;
    case "tr": return `${symbol} Nasıl Alınır?`;
    default: return `How to Buy ${symbol}`;
  }
}

/** Render the four-language step grids for the "how to buy" section. */
function coinHowtoBlocks(): string {
  return LANGS.map((l) => {
    const steps = HOWTO_STEPS.map(
      (s, i) => `    <div class="coin-step">
      <span class="coin-step-num mono">0${i + 1}</span>
      <h3>${esc(pick(s.title, l))}</h3>
      <p>${esc(pick(s.body, l))}</p>
    </div>`,
    ).join("\n");
    return `<div class="coin-steps" data-lang-block="${l}"${l === "en" ? "" : " hidden"}>\n${steps}\n</div>`;
  }).join("\n");
}

/** Full coin profile page: SEO head, live price/chart widgets, four-language
 *  content sections and a related-news block, served at the site root. */
export function renderCoinPage(coin: CoinContent, allArticles: Article[], origin: string): string {
  const url = `${origin}/${coin.slug}`;
  const alternates = Object.fromEntries(
    LANGS.map((l) => [l, l === "en" ? url : `${url}?lang=${l}`]),
  ) as Record<Lang, string>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: pick(coin.seo.title, "en"),
        description: pick(coin.seo.description, "en"),
        about: { "@type": "Thing", name: coin.name, sameAs: `https://www.coingecko.com/en/coins/${coin.id}` },
        mainEntityOfPage: { "@id": url },
        inLanguage: "en",
        author: { "@type": "Organization", name: "MAXGAZINE", url: `${origin}/` },
        publisher: {
          "@type": "Organization",
          name: "MAXGAZINE",
          logo: { "@type": "ImageObject", url: `${origin}/og-image.png` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Prices", item: `${origin}/prices.html` },
          { "@type": "ListItem", position: 3, name: coin.name, item: url },
        ],
      },
    ],
  };

  const tagSet = new Set(coin.tags.map((t) => t.toLowerCase()));
  const related = allArticles
    .filter((a) => (a.tags ?? []).some((t) => tagSet.has(t.toLowerCase())))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);

  const newsBlocks = LANGS.map((l) => {
    const inner = related.length
      ? related.map((a) => coinNewsSideCard(a, l)).join("\n")
      : `<p class="mono" data-i="coin_no_news">No related stories yet — check back soon.</p>`;
    return `<div data-lang-block="${l}"${l === "en" ? "" : " hidden"}>${inner}</div>`;
  }).join("\n");

  const AD_SLOT_TAG: Localized = { en: "AD SPACE", fa: "جایگاه تبلیغ", ar: "مساحة إعلان", tr: "REKLAM ALANI" };
  const AD_SLOT_CTA: Localized = { en: "Book this spot →", fa: "رزرو این جایگاه ←", ar: "احجز هذا المكان ←", tr: "Bu yeri ayırt →" };
  const AD_SLOT_HEADING: Localized = { en: "Exchange spotlight", fa: "معرفی صرافی", ar: "تسليط الضوء على منصة", tr: "Borsa tanıtımı" };

  const pageI = Object.fromEntries(
    LANGS.map((l) => [
      l,
      {
        pm_title: pick(coin.seo.title, l),
        pm_desc: pick(coin.seo.description, l),
        ph_title: pick(coin.h1, l),
        ph_sub: pick(coin.intro, l),
        cta_title: `${coin.name} (${coin.symbol})`,
        howto_title: howtoTitle(l, coin.symbol),
        ad_slot_tag: pick(AD_SLOT_TAG, l),
        ad_slot_cta: pick(AD_SLOT_CTA, l),
        ad_slot1: pick(AD_SLOT_HEADING, l),
      },
    ]),
  );

  const body = `<main>
<div class="page-head page-head--coin"><div class="wrap">
  <h1 data-i="ph_title">${esc(pick(coin.h1, "en"))}</h1>
  <p data-i="ph_sub">${esc(pick(coin.intro, "en"))}</p>
</div></div>

<section class="wrap section coin-hero">
  <div class="coin-hero-card reveal" data-coin-id="${esc(coin.id)}">
    <div class="coin-hero-top">
      <div class="coin-hero-id"><span class="coin-hero-name">${esc(coin.name)}</span><span class="coin-sym mono">${esc(coin.symbol)}</span></div>
      <span class="coin-updated mono"><span data-i="coin_updated">Updated</span><span data-field="updated"></span></span>
    </div>
    <div class="coin-hero-price">
      <span class="coin-price-val mono" data-field="price">—</span>
      <span class="coin-price-chg mono" data-field="chg24">—</span>
    </div>
    <div class="coin-hero-stats">
      <div class="coin-stat"><b data-i="coin_mcap">Market Cap</b><span class="mono" data-field="mcap">—</span></div>
      <div class="coin-stat"><b data-i="coin_vol">24h Volume</b><span class="mono" data-field="vol">—</span></div>
      <div class="coin-stat"><b data-i="coin_high24">24h High</b><span class="mono" data-field="high24">—</span></div>
      <div class="coin-stat"><b data-i="coin_low24">24h Low</b><span class="mono" data-field="low24">—</span></div>
    </div>
  </div>
  <div class="coin-hero-chart reveal">
    <div class="coin-chart-head mono" data-i="coin_7d_chart">7-Day Price Chart</div>
    <div class="coin-chart" data-coin-chart="${esc(coin.id)}"><div class="coin-chart-skel"></div></div>
  </div>
</section>

<section class="wrap section coin-howto reveal">
  <h2 data-i="howto_title">${esc(howtoTitle("en", coin.symbol))}</h2>
${coinHowtoBlocks()}
  <a class="btn coin-howto-cta" href="exchanges.html" data-i="coin_trade">Trade Now →</a>
</section>

<section class="wrap section coin-sections">
  <div class="coin-main">
    <h2 data-i="coin_about">About</h2>
${langProseBlocks(coin.sections.about)}
    <h2 data-i="coin_history">History</h2>
${langProseBlocks(coin.sections.history)}
    <h2 data-i="coin_story">Recent Developments</h2>
${langProseBlocks(coin.sections.story)}
  </div>
  <aside class="coin-side">
    <a class="ad-square reveal" href="contact.html" data-ad-slot="exchange">
      <span class="ad-tag mono" data-i="ad_slot_tag">AD SPACE</span>
      <h4 data-i="ad_slot1">Exchange spotlight</h4>
      <span class="ad-cta mono" data-i="ad_slot_cta">Book this spot →</span>
    </a>
    <div class="coin-related reveal">
      <h3 data-i="coin_news">Latest News</h3>
${newsBlocks}
    </div>
  </aside>
</section>

<div class="wrap section">
  <p class="mono" style="font-size:12px;color:#888;line-height:1.7" data-i="coin_disclaimer">Live prices from CoinGecko. Informational only — not financial advice.</p>
</div>
</main>`;

  return [
    head({
      lang: "en",
      title: pick(coin.seo.title, "en"),
      description: pick(coin.seo.description, "en"),
      canonical: url,
      alternates,
      jsonLd,
      prefix: "",
      bodyHtml: body,
    }),
    `<body dir="ltr" class="bs-page">`,
    rootHeader(),
    TICKER_PLACEHOLDER,
    body,
    rootFooter(),
    `<script src="assets/i18n.js"></script>`,
    `<script>window.PAGE_I = ${JSON.stringify(pageI)};</script>`,
    `<script src="assets/app.js"></script>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}
