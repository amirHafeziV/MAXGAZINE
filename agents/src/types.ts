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

/** A topic the Scout agent surfaced as worth covering. */
export interface Lead {
  title: string;
  summary: string;
  category: Category;
  /** 0–100; Orchestrator publishes the highest-scoring unseen leads. */
  importance: number;
  sources: SourceRef[];
}

export interface SourceRef {
  title: string;
  url: string;
  publishedAt?: string;
}

/** The English draft produced by the Writer, before translation. */
export interface Draft {
  slug: string;
  category: Category;
  headline: string;
  dek: string;
  /** Body as Markdown (English). */
  body: string;
  sources: SourceRef[];
}

/** Result of the Fact-Check agent. */
export interface FactCheck {
  ok: boolean;
  issues: string[];
  /** Optional corrected body the writer should adopt if ok === false. */
  revisedBody?: string;
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
}

/** A ranked exchange or broker row (revenue pages). */
export interface RankedEntity {
  name: string;
  /** Short positioning blurb per language. */
  blurb: Localized;
  /** 0–10. */
  score: number;
  /** Headline metric, e.g. "0.10% / 0.10%" or "0.0 pips". */
  metric: string;
  /** Affiliate destination. */
  url: string;
  sponsored: boolean;
}

export interface RankingTable {
  kind: "exchange" | "broker";
  updated: string;
  entries: RankedEntity[];
}

/** A single forecast row on the Future desk. */
export interface Forecast {
  asset: string;
  /** Directional thesis per language. */
  thesis: Localized;
  /** "bullish" | "bearish" | "neutral". */
  bias: "bullish" | "bearish" | "neutral";
  /** 0–100 model conviction. */
  confidence: number;
}

export interface ForecastSet {
  updated: string;
  forecasts: Forecast[];
}
