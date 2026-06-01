/**
 * Minimal RSS reader for the Scout agent. Avoids heavy deps by extracting the
 * fields we need (title / link / pubDate) from common RSS 2.0 + Atom shapes.
 */
import { XMLParser } from "fast-xml-parser";
import { config, DEFAULT_NEWS_FEEDS } from "../config.js";
import type { SourceRef } from "../types.js";

const UA = { "User-Agent": "MAXGAZINE-agent/0.1 (+https://maxgazine.com)" };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface RssItem {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string };
  pubDate?: string;
  updated?: string;
  published?: string;
}

function text(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "#text" in v)
    return String((v as { "#text": unknown })["#text"] ?? "").trim();
  return "";
}

function link(v: RssItem["link"]): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "@_href" in v) return String(v["@_href"] ?? "");
  return "";
}

async function fetchFeed(url: string): Promise<SourceRef[]> {
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = parser.parse(xml) as Record<string, any>;
    const items: RssItem[] =
      doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];
    return arr
      .map((it) => ({
        title: text(it.title),
        url: link(it.link),
        publishedAt: it.pubDate ?? it.published ?? it.updated,
      }))
      .filter((s) => s.title && s.url);
  } catch {
    return [];
  }
}

/** Pull recent headlines across all configured feeds. */
export async function fetchHeadlines(limitPerFeed = 15): Promise<SourceRef[]> {
  const feeds = config.newsFeeds.length ? config.newsFeeds : DEFAULT_NEWS_FEEDS;
  const results = await Promise.all(feeds.map((f) => fetchFeed(f)));
  return results.flatMap((items) => items.slice(0, limitPerFeed));
}
