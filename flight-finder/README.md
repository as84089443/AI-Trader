# Flight Finder ✈️

四腿票 / 反向出發地比價工具 — a flight price-comparison tool focused on two tricks
ordinary meta-search does poorly:

1. **反向出發地比價 (reverse-origin)** — for a route, compare `A→B` vs `B→A` and
   surface whichever direction is cheaper.
2. **外站四段票 (outer-station four-leg)** — evaluate a four-leg ticket
   (`outer→hub→dest→hub→outer`) where the traveler flies **all four legs** after
   self-buying a cheap positioning hop to the outer station. Savings are only real
   once the positioning cost is included, and the first leg must never be a
   no-show — the tool accounts for both.
3. **每日比價表 (`/boards`)** — pre-computed daily price tables (competitor-style).
   Built server-side on **ISR (revalidate daily)**, so the data API is hit at most
   once per day and every visitor gets the cached snapshot — no cron, no consumer
   browser extension.

**Data is for display; booking is monetized via Trip.com.** The daily boards use
the **Travelpayouts data API** (free for affiliates); the interactive search can
use the Amadeus API; an optional Skyscanner-interception extension is a third
source. All sources normalize into one model. Every booking link is a Trip.com
deep-link carrying the owner's affiliate IDs, pre-filled to the chosen flight.

> ⚠️ Affiliate links reach Trip.com's **search-results** layer (pre-filled), not a
> one-click checkout for one exact fare — that needs Trip.com's B2B booking API.
> Displayed prices are dynamic and may shift slightly on click-through.

## Monorepo layout

```
flight-finder/
  apps/web/             Next.js 14 App Router — the product
    app/api/search      server-side flight search (Amadeus, fixtures fallback)
    app/api/booking     302 → Trip.com affiliate deep-link
  packages/core/        framework-agnostic TS: types, normalize, compare, filters, affiliate
  packages/fixtures/    sample Amadeus responses for offline tests / demo mode
  extension/            Phase 1b MV3 Skyscanner interceptor (personal research)
```

The comparison/filter/affiliate logic lives in `@flight-finder/core` so every data
source (Amadeus now, Skyscanner extension later, iOS in future) shares one code
path via `normalize*` → unified model.

## Quick start

```bash
pnpm install
pnpm test                  # core unit tests (31)
pnpm dev                   # http://localhost:3000
```

With no keys the app runs in **DEMO** mode (bundled sample data on `/boards` and
the interactive search), so you can click through the whole flow immediately.

### Configure real data + affiliate

Copy `.env.example` to `apps/web/.env.local` (or set in Vercel env) and fill in:

| var | purpose |
|---|---|
| `TRAVELPAYOUTS_TOKEN` | Travelpayouts data API token (free for affiliates) — powers the daily `/boards` tables. Unset → DEMO seed data. |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | Amadeus Self-Service key for the interactive `/api/search` (optional) |
| `AMADEUS_HOSTNAME` | `test` (sandbox, default) or `production` |
| `TRIP_ALLIANCE_ID` / `TRIP_SID` | Trip.com affiliate IDs (default to the owner's real promo IDs) |
| `TRIP_REGION` / `TRIP_CURRENCY` | booking deep-link locale (default `tw` / `TWD`) |

The `/boards` page auto-refreshes daily via ISR — set `TRAVELPAYOUTS_TOKEN` once
and real prices update themselves; no cron or manual step.

## Affiliate model

`packages/core/src/affiliate.ts` builds the Trip.com `showfarefirst` deep-link.
`Allianceid` + `SID` are the fixed attribution (what earns commission); the three
`trip_sub1/2/3` slots are free-form labels for **your own** reporting — the app
sets `web-mvp` / `<route>` / `results-table` so you can see what converts. An
ezTravel builder is included as a second supplier behind the same interface.

## Verify

```bash
pnpm test                                   # 1. offline unit tests
pnpm --filter @flight-finder/web build      # 2. typecheck + production build
pnpm --filter @flight-finder/web start      # 3. POST /api/search, GET /api/booking
```

## Roadmap

- **Phase 1a (done):** Next.js web tool + core compare/filter + Trip.com deep-link + Amadeus.
- **Phase 1b:** wire the Skyscanner-interception extension as a second source.
- **Phase 2:** hotel cross-sell, price alerts, accounts/premium.
- **Phase 3:** iOS app reusing `core` + the web API.

## Extracting to its own repo

This was scaffolded inside the `AI-Trader` repo because the session couldn't create
a new GitHub repo. It is fully self-contained — to split it out:

```bash
git subtree split --prefix=flight-finder -b flight-finder-only
# then push that branch to a fresh github.com/<you>/flight-finder
```
