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

export const config = {
  siteOrigin: (process.env.SITE_ORIGIN || "https://maxgazine.com").replace(/\/$/, ""),
} as const;
