# YardVest Website + Project OS

A location-neutral YardVest product website connected to a Supabase-backed sales and delivery operating system.

```sh
php -S localhost:8080
```

Then visit `http://localhost:8080`.

## Content architecture

Editable models, finish packages, upgrades, future markets, FAQs and analytics events live near the top of `app.js`. Models support nullable specifications so conceptual designs never show fabricated values. Finish packages and future upgrades can be activated later without adding a configurator.

Public forms use Supabase Edge Functions when `config.js` contains the public project URL, anonymous key and Functions URL. `api.php` remains a local-only development fallback. Production lead data is never stored in browser `localStorage`.

## Project OS

Apply all migrations in filename order. `003_product_catalog.sql` seeds the three current product families, their styles and approved plan variants. Edge Functions implement property intake, advisor/partner inquiries, consultation booking, Stripe Checkout and verified Stripe webhooks. Resend handles transactional email on the server.

Required server secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
EMAIL_FROM
PUBLIC_SITE_URL
PUBLIC_SITE_ORIGIN
```

Deploy functions with the Supabase CLI, then configure `config.js` with public values only. Never place service-role, Stripe or Resend secrets in frontend files.

Run verification:

```sh
npm test
npm run check
```

## Asset note

Current YardVest One, YardVest Two and Suite Plus renderings and plans are stored in `assets/` and classified in `docs/design-manifest.md`. Published area language distinguishes gross footprint from verified net living area.
