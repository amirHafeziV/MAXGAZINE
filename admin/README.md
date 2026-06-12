# MasterWriter — MAXGAZINE publishing panel

Static admin panel for writing, scheduling and publishing MAXGAZINE content,
and for managing the site's ad placements. No server: the panel talks directly
to the GitHub API and commits into this repository; GitHub Actions
(`.github/workflows/build.yml`) compiles `content/` into static HTML.

## What it does

- **Dashboard** — published / waiting-to-publish / draft counts, scheduled queue, per-category totals.
- **Editor** — rich text (headings, bold/italic, bigger/smaller text, links on selected text, inline images), banner image, per-language tabs (EN/FA/AR/TR — write any subset), category (`crypto`, `forex`, `staff`, `reportage`, …), free tags, SEO fields with auto-fill.
- **Scheduling** — pick "Schedule" + a date/time; the article JSON gets `publishAt` and the hourly build releases it when the time passes.
- **Ads** — image/GIF + link for each placement (leaderboard, sponsored, newsletter, sidebar, advertorial) plus a popup with frequency cap. Saving commits `content/data/ads.json`; the live site reads it on every page load.
- **Deploy site** — triggers the build workflow manually.

## Login

The panel authenticates with a **GitHub fine-grained personal access token**
(github.com → Settings → Developer settings → Fine-grained tokens):

- Repository access: **only** `MAXGAZINE`
- Permissions: **Contents: Read and write**, **Actions: Read and write**

Each writer gets their own token (add them as repo collaborators). Logout
clears the saved token.

## Hosting at MasterWriterPanel.maxgazine.com

The panel is plain static files (`admin/`), so any static host works:

**Option A — Cloudflare Pages (recommended):**
1. Create a Pages project from this repo, build output directory `admin`.
2. Add custom domain `masterwriterpanel.maxgazine.com` (Cloudflare adds the DNS record).
3. Optional but recommended: put Cloudflare Access in front of it for an extra login layer.

**Option B — GitHub Pages:** if the main site is already on Pages, the panel is
reachable at `https://maxgazine.com/admin/`. A separate subdomain on GitHub
Pages requires a second repo, so prefer Option A for the subdomain.

> Note: domains are case-insensitive — `MasterWriterPanel.maxgazine.com` and
> `masterwriterpanel.maxgazine.com` are the same address.

## How publishing flows

```
Panel save ──commit──▶ content/articles/<slug>.json
                              │
        build.yml (push / hourly / dispatch)
                              ▼
            /en|fa|ar|tr/<slug>.html + stories indexes + sitemap.xml
```

Drafts (`status: "draft"`) and articles whose `publishAt` is in the future are
skipped by the build until ready. The agent pipeline
(`.github/workflows/publish.yml`) keeps writing automatic articles into the
same `content/` folder — panel articles and agent articles coexist.
