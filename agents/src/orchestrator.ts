import { scout } from "./agents/scout.js";
import { write } from "./agents/writer.js";
import { factCheck } from "./agents/factcheck.js";
import { translate } from "./agents/translator.js";
import { seo } from "./agents/seo.js";
import { rerank } from "./agents/ranking.js";
import { forecast } from "./agents/forecast.js";
import {
  publishArticle,
  saveRanking,
  loadRanking,
  saveForecasts,
  recentHeadlines,
} from "./agents/publisher.js";
import type { Article } from "./types.js";

const log = (msg: string) => console.log(`[orchestrator] ${msg}`);

/**
 * Full article pipeline: Scout → Writer → Fact-Check (one revise pass) →
 * Translator + SEO (parallel) → Publisher.
 * Publishes up to `count` of the highest-importance fresh leads.
 */
export async function runArticlePipeline(count = 1): Promise<Article[]> {
  const seen = await recentHeadlines();
  log(`scouting (excluding ${seen.length} recent)…`);
  const leads = await scout(seen);
  if (!leads.length) {
    log("no leads surfaced; nothing to publish.");
    return [];
  }

  const published: Article[] = [];
  for (const lead of leads.slice(0, count)) {
    log(`writing: "${lead.title}" (importance ${lead.importance})`);
    let draft = await write(lead);

    const check = await factCheck(draft);
    if (!check.ok) {
      log(`fact-check flagged ${check.issues.length} issue(s); revising.`);
      if (check.revisedBody) {
        draft = { ...draft, body: check.revisedBody };
      } else {
        log(`unfixable issues, skipping: ${check.issues.join("; ")}`);
        continue;
      }
    }

    log("translating + generating SEO…");
    const t = await translate(draft);
    const meta = await seo(draft, t.headline);

    const article: Article = {
      slug: draft.slug,
      category: draft.category,
      date: new Date().toISOString().slice(0, 10),
      author: "MAXGAZINE Agents",
      headline: t.headline,
      dek: t.dek,
      body: t.body,
      seo: meta,
      sources: draft.sources,
    };

    const path = await publishArticle(article);
    log(`published → ${path}`);
    published.push(article);
  }
  return published;
}

/** Re-score the exchange and broker tables. */
export async function runRankings(): Promise<void> {
  for (const kind of ["exchange", "broker"] as const) {
    log(`re-ranking ${kind}s…`);
    const table = await loadRanking(kind);
    const next = await rerank(table);
    const path = await saveRanking(next);
    log(`saved → ${path}`);
  }
}

/** Refresh the Future desk forecasts. */
export async function runForecasts(): Promise<void> {
  log("generating forecasts…");
  const set = await forecast();
  const path = await saveForecasts(set);
  log(`saved → ${path}`);
}
