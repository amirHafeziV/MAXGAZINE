import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo root (one level above agents/). */
export const REPO_ROOT = resolve(__dirname, "..", "..");
export const CONTENT_DIR = resolve(REPO_ROOT, "content");
export const ARTICLES_DIR = resolve(CONTENT_DIR, "articles");
export const DATA_DIR = resolve(CONTENT_DIR, "data");

/** The four languages MAXGAZINE publishes in. English is the source language. */
export const LANGS = ["en", "fa", "ar", "tr"] as const;
export type Lang = (typeof LANGS)[number];
export const SOURCE_LANG: Lang = "en";
export const RTL_LANGS: Lang[] = ["fa", "ar"];

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  fa: "فارسی",
  ar: "العربية",
  tr: "Türkçe",
};

/** OG locale codes, mirroring assets/i18n.js. */
export const OG_LOCALE: Record<Lang, string> = {
  en: "en_US",
  fa: "fa_IR",
  ar: "ar_AR",
  tr: "tr_TR",
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  siteOrigin: (process.env.SITE_ORIGIN ?? "https://maxgazine.com").replace(/\/$/, ""),
  models: {
    /** Strong model for writing, editing and judgment calls. */
    writer: process.env.MODEL_WRITER ?? "claude-opus-4-7",
    /** Cheaper/faster model for translation, classification, extraction. */
    fast: process.env.MODEL_FAST ?? "claude-haiku-4-5-20251001",
  },
  newsFeeds: (process.env.NEWS_FEEDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

/** Default RSS feeds if NEWS_FEEDS is not set. */
export const DEFAULT_NEWS_FEEDS = [
  // crypto / forex
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://cointelegraph.com/rss",
  "https://www.fxstreet.com/rss/news",
  // tech
  "https://techcrunch.com/feed/",
  "https://www.theverge.com/rss/index.xml",
  "https://arstechnica.com/feed/",
  // cars
  "https://www.motor1.com/rss/news/all/",
  "https://insideevs.com/rss/news/all/",
];
