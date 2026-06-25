/**
 * Two-axis content taxonomy and backward-compatibility bridge.
 *
 * Historically a story carried a single `category` that conflated subject
 * (crypto, cars…) with format (analysis, reportage…). Stories now carry two
 * orthogonal axes — `topic` (the desk) and `type` (the format) — plus an
 * editorial `placement`. This module is the single source of truth for the
 * vocabularies and for deriving the new axes from legacy `category`/`featured`
 * so existing content keeps rendering unchanged.
 *
 * Mirror copies of TOPICS/TYPES/CATEGORY_MAP live in admin/admin.js and
 * assets/app.js (plain browser JS that can't import this). Keep them in sync.
 */
import type { Article, Category, ContentType, Placement, Topic } from "./types.js";

export const TOPICS: readonly Topic[] = ["market", "crypto", "cars", "tech"];

export const CONTENT_TYPES: readonly ContentType[] = [
  "news",
  "article",
  "analysis",
  "review",
  "reportage",
  "podcast",
  "video",
];

/** Legacy `category` → { topic, type }. Drives backfill for old content. */
export const CATEGORY_MAP: Record<Category, { topic: Topic; type: ContentType }> = {
  markets: { topic: "market", type: "news" },
  forex: { topic: "market", type: "news" },
  crypto: { topic: "crypto", type: "news" },
  defi: { topic: "crypto", type: "news" },
  policy: { topic: "crypto", type: "news" },
  mining: { topic: "crypto", type: "news" },
  analysis: { topic: "crypto", type: "analysis" },
  reportage: { topic: "crypto", type: "reportage" },
  staff: { topic: "crypto", type: "article" },
  tech: { topic: "tech", type: "news" },
  cars: { topic: "cars", type: "news" },
};

/** New `topic` → a representative legacy `category`, so code/UI still reading
 *  `category` (badges, the stories filter, templates) keeps working. */
export const TOPIC_TO_CATEGORY: Record<Topic, Category> = {
  market: "markets",
  crypto: "crypto",
  cars: "cars",
  tech: "tech",
};

/**
 * Return a copy of the article with `topic`, `type` and `placement` guaranteed
 * present, derived from legacy fields when missing. Idempotent and lossless —
 * explicit new-axis values always win over derived ones.
 */
export function normalizeArticle(a: Article): Article {
  const mapped = a.category ? CATEGORY_MAP[a.category] : undefined;
  const topic: Topic = a.topic ?? mapped?.topic ?? "crypto";
  const type: ContentType = a.type ?? mapped?.type ?? "news";

  // Legacy `featured` is equivalent to placement.hero (which also pinned to the
  // header). Fold it in without clobbering an explicit placement.hero.
  const placement: Placement = { ...a.placement };
  if (placement.hero === undefined && a.featured) placement.hero = true;
  if (placement.priority === undefined) placement.priority = 0;

  return {
    ...a,
    topic,
    type,
    placement,
    // keep a legacy category for downstream code that still reads it
    category: a.category ?? TOPIC_TO_CATEGORY[topic],
    // keep featured mirrored to placement.hero for any remaining consumers
    featured: placement.hero === true,
  };
}
