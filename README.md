# YardVest Website + Project OS

A location-neutral YardVest product website connected to a Supabase-backed sales and delivery operating system.

```sh
php -S localhost:8080
```

Then visit `http://localhost:8080`.

## Content architecture

Editable models, finish packages, upgrades, future markets, FAQs and analytics events live near the top of `app.js`. Models support nullable specifications so conceptual designs never show fabricated values. Finish packages and future upgrades can be activated later without adding a configurator.

Public forms use Supabase Edge Functions when `config.js` contains the public project URL, anonymous key and Functions URL. Add a browser-restricted Google Maps JavaScript API key to `googleMapsApiKey` for address autocomplete and the map preview. `api.php` remains a local-only development fallback. Production lead data is never stored in browser `localStorage`.

- Customer login: `#/portal`
- YardVest team login: `#/admin`

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
EXPERT_EMAIL
PUBLIC_SITE_URL
PUBLIC_SITE_ORIGIN
```

Deploy functions with the Supabase CLI, then configure `config.js` with public values only. The live chat gives each anonymous browser a hashed visitor session, polls for expert replies, and exposes the reply queue to authenticated staff in Project OS. Never place service-role, Stripe or Resend secrets in frontend files.

Run verification:

```sh
npm test
npm run check
```

## Asset note

Current YardVest One, YardVest Two and Suite Plus renderings and plans are stored in `assets/` and classified in `docs/design-manifest.md`. Published area language distinguishes gross footprint from verified net living area.

## Independent operations backend

The adapted Project OS lives in the private `lchrenko/yardvest-backend` repository.
After its new Supabase deployment is verified, set `businessIntakeUrl` in
`config.js` to its `business-intake` function and `operationsUrl` to the staff app.
Property, advisor and partner forms will then use that endpoint, retaining a
request ID across retries. With those values empty, the existing paths remain.

Do not change the existing `supabaseUrl` / `functionsUrl` to the new Project OS
project: customer portal, chat, scheduling and payments still use the original
YardVest schema and require separate migration. The Project OS schema cannot be
applied over the website schema. No production endpoint is configured by this change.
