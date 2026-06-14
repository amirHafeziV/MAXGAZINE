# MAXGAZINE Build

Static-site build: compiles `content/articles/*.json` (written via the MasterWriter
panel or by hand) into per-language HTML under `/<lang>/<slug>.html`, regenerates
per-language stories indexes, and writes `sitemap.xml`.

- **Build** (`../build/build.ts`) — renders `/<lang>/<slug>.html`, stories indexes,
  coin pages, and `sitemap.xml` from `content/`.
- **Templates** (`../build/templates.ts`) — HTML templates used by the build.
- `src/config.ts` / `src/types.ts` — shared paths, languages, and content types used
  by the build.

Content is the source of truth: anything written into `content/` (matching the
`Article` type) gets turned into HTML matching the hand-built site templates.
Output stays crawlable static HTML (no client-side rendering) with JSON-LD +
hreflang for every page.

## Commands

```bash
npm install
npm run build       # compile content/ -> static HTML + sitemap
npm run typecheck   # tsc --noEmit
```

## CI

`.github/workflows/build.yml` runs the build whenever `content/**` changes (panel
commits), hourly (so scheduled articles go live when their `publishAt` time
passes), and on manual dispatch. Set repo variable `SITE_ORIGIN`.
