# YardVest Website + Project OS

A location-neutral YardVest product website being evolved into a connected sales and delivery operating system. Open `index.html` for the current public-site preview.

```sh
php -S localhost:8080
```

Then visit `http://localhost:8080`.

## Content architecture

Editable models, finish packages, upgrades, future markets, FAQs and analytics events live near the top of `app.js`. Models support nullable specifications so conceptual designs never show fabricated values. Finish packages and future upgrades can be activated later without adding a configurator.

Leads post to `api.php` and are written to `data/leads.ndjson`. If PHP is unavailable, the browser stores an explicit local fallback in `localStorage` under `yardvest_leads`.

## Project OS

The Supabase relational blueprint is in `supabase/migrations/001_project_os.sql`. The implementation sequence and integration boundaries are documented in `docs/project-os-architecture.md`.

## Asset note

The current approved design package is not present in this workspace. The website therefore retains clearly labeled temporary concept art. `docs/design-manifest.md` records confirmed product facts and the required asset-classification fields.
