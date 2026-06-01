# MAXGAZINE Agents

Autonomous pipeline that researches, writes, fact-checks, translates, ranks and
publishes MAXGAZINE — then compiles everything to static, SEO-ready HTML.

## Pipeline

```
Scout → Writer → Fact-Check → Translator + SEO → Publisher → (build) → static HTML
                                            Ranking ┘   Forecast ┘
```

- **Scout** (`src/agents/scout.ts`) — reads RSS + a live market snapshot, proposes leads.
- **Writer** (`writer.ts`) — drafts a grounded English article.
- **Fact-Check** (`factcheck.ts`) — verifies numbers/claims against live data & sources.
- **Translator** (`translator.ts`) — en → fa/ar/tr.
- **SEO** (`seo.ts`) — per-language title/description/keywords.
- **Ranking** (`ranking.ts`) — re-scores exchange/broker tables.
- **Forecast** (`forecast.ts`) — Future-desk calls with confidence.
- **Publisher** (`publisher.ts`) — writes `content/articles/*.json` and `content/data/*.json`.
- **Build** (`../build/build.ts`) — renders `/<lang>/<slug>.html`, per-language stories indexes, and `sitemap.xml`.

Content is the source of truth: agents emit JSON into `content/`, the build turns
it into HTML matching the hand-built site templates. Output stays crawlable static
HTML (no client-side rendering) with JSON-LD + hreflang for every page.

## Setup

```bash
cd agents
cp .env.example .env      # set ANTHROPIC_API_KEY, SITE_ORIGIN
npm install
```

## Commands

```bash
npm run publish-article -- 2   # publish 2 articles
npm run update-rankings        # re-score exchanges & brokers
npm run update-forecasts       # refresh the Future desk
npm run agents -- all 1        # everything, publishing 1 article
npm run build                  # compile content/ -> static HTML + sitemap
npm run typecheck              # tsc --noEmit
```

## CI

`.github/workflows/publish.yml` runs the whole thing every 6 hours (and on manual
dispatch), then commits the generated `content/`, `en|fa|ar|tr/` and `sitemap.xml`.
Set repo **secret** `ANTHROPIC_API_KEY` and repo **variables** `SITE_ORIGIN`
(and optional `NEWS_FEEDS`).

## Notes

- Models are configured in `src/config.ts` (Opus for writing/judgment, Haiku for
  translation/extraction). Override with `MODEL_WRITER` / `MODEL_FAST`.
- Live data mirrors the browser app: CoinGecko (crypto) + Frankfurter/ECB (forex),
  both keyless.
- Generated article pages live under language-prefixed paths (`/fa/<slug>.html`)
  cross-linked via `hreflang` — best practice for translated long-form content.
