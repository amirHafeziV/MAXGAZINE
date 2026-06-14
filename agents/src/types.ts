import type { Lang } from "./config.js";

/** A localized string: one value per language. */
export type Localized = Record<Lang, string>;

export type Category =
  | "markets"
  | "crypto"
  | "forex"
  | "defi"
  | "policy"
  | "mining"
  | "analysis"
  | "tech"
  | "cars"
  | "staff"
  | "reportage";

export interface SourceRef {
  title: string;
  url: string;
  publishedAt?: string;
}

/** SEO metadata produced for an article. */
export interface SeoMeta {
  /** <title> per language. */
  title: Localized;
  /** meta description per language. */
  description: Localized;
  /** 3–6 keywords per language. */
  keywords: Record<Lang, string[]>;
}

/** A fully assembled, publishable article (all languages). */
export interface Article {
  slug: string;
  category: Category;
  /** ISO date, e.g. "2026-05-29". */
  date: string;
  author: string;
  headline: Localized;
  dek: Localized;
  /** Body Markdown per language. */
  body: Localized;
  seo: SeoMeta;
  sources: SourceRef[];
  /** Free-form tags shown on the article and used as extra keywords. */
  tags?: string[];
  /** "draft" articles are skipped by the build. Default: "published". */
  status?: "draft" | "published";
  /** ISO datetime; the build skips the article until this time has passed. */
  publishAt?: string;
  /** Banner image path/URL rendered above the article body. */
  banner?: string;
  /**
   * Rich-text HTML body per language (written via the MasterWriter panel).
   * When set for a language it takes precedence over the Markdown `body`.
   */
  bodyHtml?: Partial<Localized>;
  /** When true, this article is pinned to the site header and homepage hero. Requires a banner. */
  featured?: boolean;
}
