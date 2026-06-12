import { LANGS, RTL_LANGS, OG_LOCALE, LANG_NAMES, type Lang } from "../agents/src/config.js";
import type { Article } from "../agents/src/types.js";

/** Chrome strings, mirrored from assets/i18n.js (window.I). Keep in sync. */
const CHROME: Record<Lang, Record<string, string>> = {
  en: {
    nav_stories: "Stories", nav_prices: "Prices", nav_exchanges: "Exchanges",
    nav_brokers: "Brokers", nav_future: "Future", nav_about: "About",
    foot_explore: "Explore", foot_markets: "Markets", foot_company: "Company", foot_lang: "Languages",
    f_stories: "Stories", f_chart: "Chart", f_future: "Future", f_prices: "Prices",
    f_exchanges: "Top Exchanges", f_brokers: "Top Brokers", f_about: "About Us", f_contact: "Contact Us",
    f_copy: "© 2026 MAXGAZINE — AI-AGENT CRYPTO & FOREX MEDIA", f_built: "PUBLISHED BY AUTONOMOUS AGENTS",
    stories_title: "Stories", read_more: "Read →", sources: "Sources", published: "Published",
  },
  fa: {
    nav_stories: "مطالب", nav_prices: "قیمت‌ها", nav_exchanges: "صرافی‌ها",
    nav_brokers: "بروکرها", nav_future: "آینده", nav_about: "درباره",
    foot_explore: "کاوش", foot_markets: "بازارها", foot_company: "شرکت", foot_lang: "زبان‌ها",
    f_stories: "مطالب", f_chart: "نمودار", f_future: "آینده", f_prices: "قیمت‌ها",
    f_exchanges: "برترین صرافی‌ها", f_brokers: "برترین بروکرها", f_about: "درباره ما", f_contact: "تماس با ما",
    f_copy: "© ۲۰۲۶ مکس‌گزین — رسانه کریپتو و فارکس مبتنی بر ایجنت", f_built: "منتشرشده توسط ایجنت‌های خودمختار",
    stories_title: "مطالب", read_more: "خواندن ←", sources: "منابع", published: "انتشار",
  },
  ar: {
    nav_stories: "المقالات", nav_prices: "الأسعار", nav_exchanges: "المنصّات",
    nav_brokers: "الوسطاء", nav_future: "المستقبل", nav_about: "حول",
    foot_explore: "استكشف", foot_markets: "الأسواق", foot_company: "الشركة", foot_lang: "اللغات",
    f_stories: "المقالات", f_chart: "الرسم البياني", f_future: "المستقبل", f_prices: "الأسعار",
    f_exchanges: "أفضل المنصّات", f_brokers: "أفضل الوسطاء", f_about: "حول", f_contact: "تواصل معنا",
    f_copy: "© ٢٠٢٦ ماكسغازين — إعلام كريبتو وفوركس مدعوم بالوكلاء", f_built: "منشور بواسطة وكلاء مستقلين",
    stories_title: "المقالات", read_more: "اقرأ ←", sources: "المصادر", published: "نُشر",
  },
  tr: {
    nav_stories: "Haberler", nav_prices: "Fiyatlar", nav_exchanges: "Borsalar",
    nav_brokers: "Aracılar", nav_future: "Gelecek", nav_about: "Hakkında",
    foot_explore: "Keşfet", foot_markets: "Piyasalar", foot_company: "Şirket", foot_lang: "Diller",
    f_stories: "Haberler", f_chart: "Grafik", f_future: "Gelecek", f_prices: "Fiyatlar",
    f_exchanges: "En İyi Borsalar", f_brokers: "En İyi Aracılar", f_about: "Hakkımızda", f_contact: "İletişim",
    f_copy: "© 2026 MAXGAZINE — YZ AJANI KRİPTO & FOREX MEDYASI", f_built: "OTONOM AJANLAR TARAFINDAN YAYINLANDI",
    stories_title: "Haberler", read_more: "Oku →", sources: "Kaynaklar", published: "Yayımlandı",
  },
};

const FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=Fraunces:opsz,wght@9..144,500..900&family=Estedad:wght@400;500;700;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

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

/** Minimal, safe Markdown → HTML (paragraphs, ##/###, bold, italic, links, lists). */
export function md(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  const inline = (t: string) =>
    esc(t)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line.startsWith("### ")) { closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (line.startsWith("## ")) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
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
  const nav = [
    ["stories.html", c.nav_stories], ["prices.html", c.nav_prices],
    ["exchanges.html", c.nav_exchanges], ["brokers.html", c.nav_brokers],
    ["future.html", c.nav_future], ["about.html", c.nav_about],
  ]
    .map(([href, label]) => `<a href="${prefix}${href}${s}">${esc(label!)}</a>`)
    .join("\n      ");
  const langBtns = LANGS.map(
    (l) => `<button data-lang="${l}"${l === lang ? ' class="active"' : ""} lang="${l}">${l === "fa" ? "فا" : l === "ar" ? "ع" : l.toUpperCase()}</button>`,
  ).join("");
  return `<body dir="${RTL_LANGS.includes(lang) ? "rtl" : "ltr"}">

<div class="ticker" aria-label="Live prices"><div class="ticker-track" id="ticker">
  <span>BTC <span class="up">$94,210 ▲ 2.40%</span></span><span>ETH <span class="up">$3,180 ▲ 1.10%</span></span><span>EUR/USD <span class="up">1.0850 ▲ 0.12%</span></span>
  <span>BTC <span class="up">$94,210 ▲ 2.40%</span></span><span>ETH <span class="up">$3,180 ▲ 1.10%</span></span><span>EUR/USD <span class="up">1.0850 ▲ 0.12%</span></span>
</div></div>

<header class="topbar"><div class="wrap">
  <a class="logo" href="${prefix}index.html${s}"><span class="dot"></span>MAXGAZINE</a>
  <nav class="nav" aria-label="Primary">
    <div class="nav-links">
      ${nav}
    </div>
    <div class="socials"><a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="X">X</a><a href="#" aria-label="YouTube">YT</a></div>
    <div class="lang" role="group" aria-label="Select language">${langBtns}</div>
    <button class="burger" aria-label="Toggle menu" aria-expanded="false">☰</button>
  </nav>
</div></header>`;
}

function chromeFooter(lang: Lang, prefix: string): string {
  const c = CHROME[lang];
  const s = langSuffix(lang);
  const langLinks = LANGS.map(
    (l) => `<a href="#" data-lang="${l}">${LANG_NAMES[l]}</a>`,
  ).join("");
  return `<footer><div class="wrap">
  <div class="foot-top">
    <div class="foot-logo">MAXGAZINE<span class="dot">.</span></div>
    <div class="foot-cols">
      <div class="foot-col"><h5>${esc(c.foot_explore!)}</h5><a href="${prefix}stories.html${s}">${esc(c.f_stories!)}</a><a href="${prefix}chart.html${s}">${esc(c.f_chart!)}</a><a href="${prefix}future.html${s}">${esc(c.f_future!)}</a><a href="${prefix}prices.html${s}">${esc(c.f_prices!)}</a></div>
      <div class="foot-col"><h5>${esc(c.foot_markets!)}</h5><a href="${prefix}exchanges.html${s}">${esc(c.f_exchanges!)}</a><a href="${prefix}brokers.html${s}">${esc(c.f_brokers!)}</a></div>
      <div class="foot-col"><h5>${esc(c.foot_company!)}</h5><a href="${prefix}about.html${s}">${esc(c.f_about!)}</a><a href="${prefix}contact.html${s}">${esc(c.f_contact!)}</a></div>
      <div class="foot-col"><h5>${esc(c.foot_lang!)}</h5>${langLinks}</div>
    </div>
  </div>
  <div class="foot-bottom mono"><span>${esc(c.f_copy!)}</span><span>${esc(c.f_built!)}</span></div>
</div></footer>

<script src="${prefix}assets/i18n.js"></script>
<script src="${prefix}assets/app.js"></script>
</body>
</html>`;
}

/** Full article page for one language. */
export function renderArticle(
  article: Article,
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
    ? `<img class="article-banner" src="${esc(article.banner.startsWith("http") ? article.banner : `${prefix}${article.banner.replace(/^\/+/, "")}`)}" alt="${esc(pick(article.headline, lang))}" style="width:100%;height:auto;display:block;margin:0 0 28px;border:2px solid #0a0a0a">`
    : "";
  const tagsHtml = article.tags?.length
    ? `<div class="tags mono" style="display:flex;gap:8px;flex-wrap:wrap;margin:28px 0 0">${article.tags
        .map((t) => `<span class="chip">${esc(t)}</span>`)
        .join("")}</div>`
    : "";
  // Per language: rich HTML wins over Markdown; fall back across languages.
  const richHtml = article.bodyHtml?.[lang] ?? (article.body?.[lang] ? undefined : pick(article.bodyHtml, lang) || undefined);
  const body = `<main>
<article class="wrap section" style="max-width:760px">
  <div class="kicker mono">${esc(article.category.toUpperCase())}</div>
  <h1>${esc(pick(article.headline, lang))}</h1>
  <p class="dek" style="font-size:20px;color:#444;line-height:1.5;margin:14px 0 8px">${esc(pick(article.dek, lang))}</p>
  <div class="byline mono" style="color:#888;font-size:13px;margin-bottom:28px">${esc(c.published!)} ${esc(article.date)} · ${esc(article.author)}</div>
  ${bannerHtml}
  <div class="prose" style="line-height:1.8">
${richHtml ? sanitizeHtml(richHtml) : md(pick(article.body, lang))}
  </div>
  ${tagsHtml}
  ${sourcesHtml}
</article>
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
): string {
  const c = CHROME[lang];
  const prefix = "../";
  const alternates = Object.fromEntries(
    LANGS.map((l) => [l, `${origin}/${l}/stories.html`]),
  ) as Record<Lang, string>;
  const canonical = alternates[lang];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.stories_title,
    url: canonical,
    inLanguage: lang,
    hasPart: articles.map((a) => ({
      "@type": "NewsArticle",
      headline: pick(a.headline, lang),
      url: `${origin}/${lang}/${a.slug}.html`,
      datePublished: a.date,
    })),
  };

  const cards = articles
    .map((a) => {
      const img = a.banner
        ? `<span class="card-img"><img src="${esc(a.banner.startsWith("http") ? a.banner : `${prefix}${a.banner.replace(/^\/+/, "")}`)}" alt="" loading="lazy"></span>
      `
        : "";
      return `    <a class="card${a.banner ? " has-img" : ""}" href="${prefix}${lang}/${a.slug}.html">
      ${img}<div class="cat mono">${esc(a.category.toUpperCase())} · ${esc(a.date)}</div>
      <h3>${esc(pick(a.headline, lang))}</h3>
      <p>${esc(pick(a.dek, lang))}</p>
      <span class="mono">${esc(c.read_more!)}</span>
    </a>`;
    })
    .join("\n");

  const body = `<main>
<div class="page-head"><div class="wrap"><h1>${esc(c.stories_title!)}</h1></div></div>
<div class="wrap section"><div class="grid">
${cards || "    <p>No stories yet.</p>"}
</div></div>
</main>`;

  return [
    head({
      lang,
      title: `${c.stories_title} — MAXGAZINE`,
      description: "Latest crypto and forex stories from MAXGAZINE agents.",
      canonical,
      alternates,
      jsonLd,
      prefix,
      bodyHtml: body,
    }),
    chromeHeader(lang, prefix),
    body,
    chromeFooter(lang, prefix),
  ].join("\n");
}
