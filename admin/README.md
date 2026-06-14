# MasterWriter — MAXGAZINE publishing panel

Admin panel for writing, scheduling and publishing MAXGAZINE content, and for
managing the site's ad placements. The panel commits into this repository via
`api.php`, a thin server-side proxy to the GitHub API; GitHub Actions
(`.github/workflows/build.yml`) compiles `content/` into static HTML.

## What it does

- **Dashboard** — published / waiting-to-publish / draft counts, scheduled queue, per-category totals.
- **Editor** — rich text (headings, bold/italic, bigger/smaller text, links on selected text, inline images), banner image, per-language tabs (EN/FA/AR/TR — write any subset), category (`crypto`, `forex`, `staff`, `reportage`, …), free tags, SEO fields with auto-fill.
- **Scheduling** — pick "Schedule" + a date/time; the article JSON gets `publishAt` and the hourly build releases it when the time passes.
- **Ads** — image/GIF + link for each placement (leaderboard, sponsored, newsletter, sidebar, advertorial) plus a popup with frequency cap. Saving commits `content/data/ads.json`; the live site reads it on every page load.
- **Deploy site** — triggers the build workflow manually.

## Login

**Username/password (PHP + SQLite).** `index.php` only serves the panel to a
signed-in session. Users live in `data/mw-users.sqlite` (bcrypt-hashed
passwords, file blocked from the web by `.htaccess`). That's the only login —
once signed in, the panel publishes automatically through the shared GitHub
token in `config.php` (see below); writers never see or enter a GitHub token.

- **Invite links (preferred).** `register.php?t=<token>` opens a sign-up page
  *only* for someone holding a valid invite token; they pick a username +
  password and are logged straight in as an **admin**. Each token works
  **once** — after sign-up the same link is dead. Tokens are configured as
  SHA-256 hashes in `lib.php` (`MW_ADMIN_INVITES`); the raw links are kept off
  the repo. To mint a new one: `php -r 'echo bin2hex(random_bytes(24));'`,
  add its `hash('sha256', …)` to `MW_ADMIN_INVITES`, and hand out
  `register.php?t=<token>`.
- First visit ever → `setup.php` also lets you create an owner account (legacy
  path; invite links replace it).
- Manage writers from the cPanel **Terminal**:
  `php users.php list | add <user> | passwd <user> | del <user>`
- Sign out at `logout.php`. Failed logins are throttled (10 per IP / 10 min).
- **Panel won't load?** Open `health.php` — it runs no DB/session code and
  reports PHP version + whether the `pdo_sqlite` extension is enabled (the
  usual culprit on cPanel). Delete it once the panel works.

## Publishing token (server-side, one-time setup)

`api.php` is the only thing that talks to GitHub, using one token configured
in `admin/config.php` (gitignored — copy it from `config.example.php`):

1. Create a **fine-grained personal access token**
   (github.com → Settings → Developer settings → Fine-grained tokens):
   - Repository access: **only** `MAXGAZINE`
   - Permissions: **Contents: Read and write**, **Actions: Read and write**
2. On the host, `cp admin/config.example.php admin/config.php` and fill in
   `MW_GH_TOKEN` (plus owner/repo/branch/origin if different from the
   defaults). `.htaccess` blocks this file from being served directly.
3. If the token is ever revoked or rotated, just edit `config.php` — no
   redeploy or writer action needed.

## Hosting at AuthorsPanel.maxgazine.com (cPanel)

1. cPanel → **Domains → Create a New Domain** (or *Subdomains*): add
   `authorspanel.maxgazine.com`, document root `authorspanel`
   (a sibling of `public_html`, so the panel is *not* under the main site).
   If DNS is managed elsewhere (e.g. Cloudflare), also add an A/CNAME record
   for `authorspanel` pointing at the host.
2. Enable **AutoSSL** for the new subdomain (cPanel → SSL/TLS Status).
3. Upload the panel: `./deploy-panel.sh <ftp-host> <ftp-user>` from the repo
   root (mirrors `admin/` into `authorspanel/`, never touches the
   on-host `data/` folder).
4. Open `https://authorspanel.maxgazine.com` → `setup.php` appears →
   create the owner account. Done.

> Note: domains are case-insensitive — `AuthorsPanel.maxgazine.com` and
> `authorspanel.maxgazine.com` are the same address.

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
