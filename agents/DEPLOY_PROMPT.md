# MAXGAZINE Deploy — Operating Brief

This describes the **full path from a new `content/articles/*.json` file to
it being visible on https://maxgazine.com**. Follow this whenever new
articles/ads have been added or changed and need to go live.

## The pipeline, end to end

```
content/articles/*.json  (source of truth)
        │
        ▼
  npm run build  (agents/ → build/build.ts)
        │  generates:
        │   - en/<slug>.html, fa/<slug>.html, ar/<slug>.html, tr/<slug>.html
        │   - en/stories.html, fa/..., ar/..., tr/...  (indexes, homepage cards)
        │   - sitemap.xml
        │   - content/data/feed.json, content/data/coin-pages.json
        │   - coin pages (bitcoin-btc.html, etc.)
        ▼
  git commit + push to main
        │
        ▼
  GitHub Actions (.github/workflows/build.yml) — re-runs the build on any
  push touching content/**, hourly (for scheduled articles), or via the
  panel's "⟳ Deploy site" button. Commits regenerated en/ fa/ ar/ tr/ and
  sitemap.xml back to main automatically.
        │
        ▼
  ./deploy.sh <ftp-host> <ftp-user>  — FTP-mirrors the LOCAL working tree
  (en/, fa/, ar/, tr/, content/, root *.html, sitemap.xml, favicons) to the
  cPanel server's public_html. THIS STEP IS MANUAL AND NOT AUTOMATED.
        │
        ▼
  Live on maxgazine.com
```

## Critical things to know

1. **`deploy.sh` does not build.** It only FTP-mirrors whatever HTML/JSON
   already exists in your local working copy. If you add/change
   `content/articles/*.json` and run `deploy.sh` *without running
   `npm run build` first*, nothing visible changes — the new article's page
   may already exist (or not exist at all), but the homepage, stories index,
   sitemap, feed, and "related articles" links — which are what make a new
   article *discoverable* — are not regenerated. **This is why a deploy can
   appear to do nothing.**

2. **GitHub Actions does not deploy to the live server.** It only rebuilds
   HTML and commits it back to `main` in the repo. Getting that onto
   maxgazine.com still requires running `deploy.sh` (or pulling the CI's
   commit locally before deploying).

3. **Before running `deploy.sh`, your local working tree must contain the
   fully built output** — i.e. you must have run `npm run build` (or pulled
   a commit that already contains the build output) *after* the last content
   change.

4. **`deploy.sh` requires FTP credentials interactively** — host, username,
   and a password prompt. Never put the password in a file or pass it as a
   command-line argument.

## Standard deploy procedure

Run from the repo root:

```bash
# 1. Make sure content/articles/*.json reflects everything that should be live
#    (panel saves, agent-written JSON, manual edits — all already committed
#    or at least present on disk).

# 2. Build the static site
cd agents && npm install && npm run build && cd ..

# 3. Review what changed — should be en/ fa/ ar/ tr/ HTML, stories indexes,
#    sitemap.xml, content/data/feed.json, and any coin pages affected.
git status

# 4. Commit and push (so GitHub/admin panel and CI stay in sync with the
#    live site)
git add -A
git commit -m "build: publish latest content"
git push

# 5. Deploy to the live server (prompts for FTP password)
./deploy.sh <ftp-host> <ftp-username>
```

## When ONLY the panel is used (no local steps)

If all changes come through the MasterWriter panel (writers saving
articles/ads), the panel commits `content/articles/*.json` directly to
GitHub, and GitHub Actions rebuilds `en/ fa/ ar/ tr/` + `sitemap.xml`
automatically. **The site is still not live** until someone:

```bash
git pull
./deploy.sh <ftp-host> <ftp-username>
```

This manual FTP step is the one part of the pipeline with no automation.
If you want "Save in panel" to mean "live on the site" with zero manual
steps, that requires adding an FTP-deploy job to
`.github/workflows/build.yml` using GitHub Secrets for the cPanel
credentials — a separate, explicitly-approved change (not done here).

## Known gap to be aware of

`.github/workflows/build.yml`'s commit step only stages
`en/ fa/ ar/ tr/ sitemap.xml` — it does **not** stage
`content/data/feed.json` (or `content/data/coin-pages.json`), even though
`npm run build` regenerates them. So when CI rebuilds after a panel save,
`feed.json` can drift out of sync with the actual published articles until
someone runs a local build + commits it (as in the standard procedure
above). Worth fixing in `build.yml` by adding those paths to the `git add`
line — flagged here, not changed as part of this task.
