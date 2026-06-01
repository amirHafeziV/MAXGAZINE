import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ARTICLES_DIR, DATA_DIR } from "../config.js";
import type { Article, ForecastSet, RankingTable } from "../types.js";

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

/** Persist a finished article as content/articles/<slug>.json. */
export async function publishArticle(article: Article): Promise<string> {
  await ensureDir(ARTICLES_DIR);
  const path = join(ARTICLES_DIR, `${article.slug}.json`);
  await writeFile(path, JSON.stringify(article, null, 2) + "\n", "utf8");
  return path;
}

export async function saveRanking(table: RankingTable): Promise<string> {
  await ensureDir(DATA_DIR);
  const path = join(DATA_DIR, `${table.kind === "exchange" ? "exchanges" : "brokers"}.json`);
  await writeFile(path, JSON.stringify(table, null, 2) + "\n", "utf8");
  return path;
}

export async function loadRanking(kind: "exchange" | "broker"): Promise<RankingTable> {
  const path = join(DATA_DIR, `${kind === "exchange" ? "exchanges" : "brokers"}.json`);
  return JSON.parse(await readFile(path, "utf8")) as RankingTable;
}

export async function saveForecasts(set: ForecastSet): Promise<string> {
  await ensureDir(DATA_DIR);
  const path = join(DATA_DIR, "forecasts.json");
  await writeFile(path, JSON.stringify(set, null, 2) + "\n", "utf8");
  return path;
}

/** Titles of recently published articles, used by Scout to avoid duplicates. */
export async function recentHeadlines(limit = 40): Promise<string[]> {
  try {
    const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith(".json"));
    const titles: Array<{ date: string; title: string }> = [];
    for (const f of files) {
      const a = JSON.parse(await readFile(join(ARTICLES_DIR, f), "utf8")) as Article;
      titles.push({ date: a.date, title: a.headline.en });
    }
    return titles
      .sort((x, y) => (x.date < y.date ? 1 : -1))
      .slice(0, limit)
      .map((t) => t.title);
  } catch {
    return [];
  }
}
