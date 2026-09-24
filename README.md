# YardVest MVP

A location-neutral, dependency-free marketing site for YardVest. Open `index.html` for a static preview or run a PHP server to enable server-side lead persistence:

```sh
php -S localhost:8080
```

Then visit `http://localhost:8080`.

## Content architecture

Editable models, finish packages, upgrades, future markets, FAQs and analytics events live near the top of `app.js`. Models support nullable specifications so conceptual designs never show fabricated values. Finish packages and future upgrades can be activated later without adding a configurator.

Leads post to `api.php` and are written to `data/leads.ndjson`. If PHP is unavailable, the browser stores an explicit local fallback in `localStorage` under `yardvest_leads`.

## Source audit

- Reused conceptually: structured model data, compatible upgrade relationships, hash routing, responsive product cards, inquiry persistence pattern, and gallery-ready data fields.
- Adapted: model detail views, lead capture, FAQ interaction, and admin-editable content represented as compact JavaScript configuration.
- Discarded: lot marketplace, landowner submissions, home/land packages, public contractor directory, exposed admin portal, large configurator, Firebase boot dependency, and stock-image-heavy visual system.
- New: YardVest brand system, address-first property flow, three-model collection, incentives content, partner inquiry, location-neutral schema, privacy/terms copy, lightweight event queue, and replaceable architectural-plan placeholders.

## Asset note

The supplied archive did not contain YardVest plan PDFs or render files. The MVP therefore uses original CSS architectural concept art and clearly labeled plan placeholders. Add optimized plan images to the model `floorPlan`/`gallery` fields when the source assets are available.
