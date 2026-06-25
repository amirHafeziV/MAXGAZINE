import type { Lang } from "./config.js";

/** A localized string: one value per language. */
export type Localized = Record<Lang, string>;

/**
 * Legacy single-axis classification. Kept for backward compatibility: existing
 * content still carries it, and the build derives the new `topic`/`type` axes
 * from it when those are absent (see taxonomy.ts).
 * @deprecated Use the orthogonal `topic` + `type` fields instead.
 */
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

/** Subject matter — the *what* of a story. One of four desks. */
export type Topic = "market" | "crypto" | "cars" | "tech";

/** Content format — the *how* a story is told. */
export type ContentType =
  | "news"
  | "article"
  | "analysis"
  | "review"
  | "reportage"
  | "podcast"
  | "video";

/**
 * Editorial placement on the homepage. Each flag is an independent control the
 * editor sets at publish time; `priority` orders stories within a section
 * (higher floats up; default 0 falls back to publish-date ordering).
 */
export interface Placement {
  /** Show in the hero stage (and pin to the site header). Requires a banner. */
  hero?: boolean;
  /** Surface in the Editor's Pick rail. */
  editorsPick?: boolean;
  /** Keep out of the LATEST feed/river. */
  hideFromLatest?: boolean;
  /** Float to the top of LATEST regardless of date. */
  pinned?: boolean;
  /** Manual ordering weight; higher sorts first. Default 0. */
  priority?: number;
}

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
  /**
   * Legacy classification. Optional going forward — new content sets `topic`
   * and `type` instead, and the build backfills this from them for any code
   * still reading it.
   * @deprecated Prefer `topic` + `type`.
   */
  category?: Category;
  /** Subject desk: market / crypto / cars / tech. */
  topic?: Topic;
  /** Content format: news / article / analysis / review / reportage / podcast / video. */
  type?: ContentType;
  /** Homepage placement controls set by the editor at publish time. */
  placement?: Placement;
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
