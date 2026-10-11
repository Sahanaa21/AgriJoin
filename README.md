# AgriJoin

**Connecting Farmers. Empowering Labourers. Growing Together.**

AgriJoin is an early-stage agricultural labour marketplace that connects farmers
who need agricultural workers with labourers looking for work. Farmers publish
job requirements; labourers discover relevant opportunities nearby, review
details, apply, and communicate with farmers — all over one shared backend used
by both a responsive website and a mobile app.

> This is an early-stage student project. It contains **no** real users, hiring
> statistics, ratings, earnings, partnerships, or investor claims. All sample
> data is clearly labelled and fictional.

---

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Directory structure](#directory-structure)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment variables](#environment-variables)
8. [Database setup & migrations](#database-setup--migrations)
9. [Seed data](#seed-data)
10. [Running the apps](#running-the-apps)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Security notes](#security-notes)
14. [Known limitations](#known-limitations)
15. [Troubleshooting](#troubleshooting)
16. [Future roadmap](#future-roadmap)

---

## Features

**Accounts & roles**
- Email/password auth (Supabase Auth), session persistence, logout, protected routes.
- Two roles — **farmer** and **labourer** — chosen at sign-up and enforced server-side by Row Level Security (RLS).
- Role-specific onboarding and dashboards.

**Farmer**
- Dashboard with live counts (active jobs, applications, pending) from real records.
- Post, edit, pause/reopen, mark filled, and close jobs.
- Review applications to their own jobs; accept/reject (capacity-safe).
- Message applicants.

**Labourer**
- Dashboard with application summary, profile completion, nearby jobs.
- Browse/search/filter/sort open jobs with pagination.
- Job details with duplicate-application prevention and clear "why you can't apply" messaging.
- Apply to jobs, withdraw, track status; message farmers.

**Shared**
- Interactive Leaflet map (website) of job locations with popups + details link.
- Approximate distances computed **only** when real coordinates exist.
- In-app messaging limited to conversation participants.
- Explainable, deterministic "Best match" ranking (not AI) — see [docs/architecture.md](docs/architecture.md).

See [docs/architecture.md](docs/architecture.md) and [docs/security.md](docs/security.md) for detail.

## Technology stack

| Area      | Choice |
|-----------|--------|
| Website   | React 18, Vite, TypeScript, Tailwind CSS, React Router, Lucide icons, Leaflet |
| Mobile    | React Native, Expo (SDK 52), Expo Router, TypeScript |
| Backend   | Supabase (PostgreSQL + Auth + Storage) with RLS and SQL functions; optional thin Express/TypeScript API |
| Validation| Zod (shared), React Hook Form (website forms) |
| Shared    | `@agrijoin/shared` — types, Zod schemas, constants, distance + matching logic (unit-tested) |
| Tests     | Vitest (shared, api), Supertest (api) |

<!-- readme-more -->

## Architecture

```
                     ┌──────────────────────────────┐
   Website (React) ──┤                              │
                     │   Supabase (shared backend)  │
   Mobile (Expo)  ───┤   • PostgreSQL + RLS         │
                     │   • Auth (email/password)    │
   Optional Express ─┤   • SQL functions (RPC)      │
   API (thin)        │   • Storage (future)         │
                     └──────────────────────────────┘
```

Both apps talk to the **same** Supabase project, so a job posted on the website
appears in the mobile app, and an application submitted on mobile is visible to
the farmer on the website — there are no separate datasets.

**Why the Express API is thin and optional.** Supabase already provides auth, a
REST/RPC data layer, and row-level authorization. A full CRUD API on top would
mostly duplicate that. So the clients talk to Supabase directly (protected by
RLS), and transactional rules that RLS can't express — atomic "apply", capacity-
safe "accept", status transitions, consented contact sharing — live in
**SECURITY DEFINER SQL functions** that run on the database for every client.
The Express API (`apps/api`) is a small, optional layer that verifies the user's
JWT and calls those same functions; it exists to demonstrate the server pattern
and host future privileged logic. The apps run fully without it. Full rationale:
[docs/architecture.md](docs/architecture.md).

## Directory structure

```
AgriJoin/
├─ apps/
│  ├─ web/          React + Vite website
│  ├─ mobile/       React Native + Expo app
│  └─ api/          Optional thin Express API
├─ packages/
│  └─ shared/       Types, Zod schemas, constants, distance + matching (unit-tested)
├─ supabase/
│  ├─ migrations/   0001_schema → 0002_rls → 0003_functions → 0004_views
│  ├─ seed.sql      Demo domain data (SQL)
│  └─ seed.mjs      Demo seeder (creates demo auth users + data via Admin API)
├─ docs/            architecture.md, security.md
├─ .env.example     Placeholders only — copy to .env (git-ignored)
└─ package.json     npm workspaces root
```

## Prerequisites

- **Node.js ≥ 20** and npm ≥ 10 (developed on Node 24 / npm 11)
- A **Supabase** project (the URL is already set to the project in `.env.example`)
- For mobile testing: the **Expo Go** app on an Android phone, or an emulator
- Optional: the **Supabase CLI** for migrations (`npm i -g supabase`)

## Installation

```bash
git clone https://github.com/Sahanaa21/AgriJoin.git
cd AgriJoin
npm install          # installs all workspaces
npm run build:shared # compile the shared package once
```

## Environment variables

Copy the template and fill in the real values (the file is git-ignored):

```bash
cp .env.example .env
```

| Variable | Used by | Notes |
|----------|---------|-------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | website | Public anon key — safe in the browser because RLS protects data |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Same anon key |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | API | Server reads these |
| `SUPABASE_SERVICE_ROLE_KEY` | API + seeder only | **Server-side only. Never ship to clients.** |

Get the keys from **Supabase Dashboard → Project Settings → API**. The project
URL is `https://ecyugokcecwhwtiqxfnl.supabase.co`.

> **Security:** never commit `.env` or any real key. `.gitignore` already blocks
> `.env*` (except `.env.example`), key files, and keystores.

## Database setup & migrations

Apply the migrations in order. **Option A — Supabase SQL Editor (no CLI):** open
each file under `supabase/migrations/` in order (`0001` → `0004`) and run it.

**Option B — Supabase CLI:**

```bash
supabase login
supabase link --project-ref ecyugokcecwhwtiqxfnl
supabase db push          # applies supabase/migrations/*
```

Then **enable immediate sign-in for the demo**: Supabase Dashboard → Authentication
→ Providers → Email → turn **"Confirm email" off** (so email/password sign-up
returns a session right away). Leave it on for production and implement a
confirmation flow.

## Seed data

The reliable seeder creates demo auth users (via the Admin API) and inserts
fictional profiles, jobs and applications:

```bash
node --env-file=.env supabase/seed.mjs
```

Demo login (all demo users share this password): `DemoPass123!`
- Farmer:   `demo.suresh@agrijoin.test`
- Labourer: `demo.labourer1@agrijoin.test`

`supabase/seed.sql` contains the same domain data for `supabase db reset`
workflows (it needs the demo auth users to exist first — the `.mjs` seeder
creates them).

## Running the apps

```bash
# Website  → http://localhost:5173
npm run dev:web

# Optional API → http://localhost:4000  (GET /health)
npm run dev:api

# Mobile (Expo) → scan the QR code with Expo Go
npm run dev:mobile
```

Build for production:

```bash
npm run build:web     # outputs apps/web/dist
npm run build:api     # outputs apps/api/dist
```

## Testing

```bash
npm test                               # all workspaces
npm run test --workspace @agrijoin/shared   # distance, matching, schemas (24 tests)
npm run test --workspace @agrijoin/api      # health + auth guards (Supertest)
npm run typecheck                      # TypeScript across all workspaces
cd apps/mobile && npx expo-doctor      # Expo project health (18 checks)
```

## Deployment

- **Supabase** (free tier): apply migrations + seed as above. Note free-tier
  projects pause after inactivity (cold start on first request).
- **Website**: deploy `apps/web` to Vercel/Netlify/Cloudflare Pages. Set the
  `VITE_*` env vars in the host. Build command `npm run build:web`, output
  `apps/web/dist`.
- **API** (only if you use it): deploy `apps/api` to Render/Railway/Fly. Set
  `SUPABASE_*` env vars incl. the service-role key as a **secret**. Free tiers
  cold-start; the core marketplace works without the API.
- **Mobile**: test with Expo Go now. For a standalone APK/AAB use EAS Build
  (`npx eas build -p android`) — this requires an Expo account and a dev/build
  step (see [docs/architecture.md](docs/architecture.md)).
- **Maps**: the website uses OpenStreetMap tiles via Leaflet — free, but subject
  to the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
  (fine for demos; use a tile provider with an API key for production traffic).

## Security notes

RLS is enabled on every table; policies are the source of truth for
authorization. Phone numbers live in a separate `user_contacts` table readable
only by the owner (or a counterparty via a consent-checked RPC). Privileged
operations run server-side in SECURITY DEFINER functions that derive identity
from `auth.uid()`, never from client input. The service-role key is never in a
client bundle. Full model: [docs/security.md](docs/security.md).

## Known limitations

- **Database not yet applied/tested here:** migrations, RLS, functions and seed
  are written but were **not executed against a live database** in this build
  because Supabase credentials (anon key / service-role key) were not provided.
  Apply them per the steps above to activate end-to-end data flow.
- **Email confirmation** must be disabled in Supabase for instant demo sign-in
  (documented above). Phone OTP is **not** implemented (no SMS provider).
- **Messaging** uses light polling (every 5s), not server push — it is not
  labelled "real-time".
- **Mobile map** is a distance-sorted list, not an interactive native map
  (an interactive map needs an Expo dev build + Google Maps key). The website
  has the full Leaflet map.
- **Ratings/earnings** are intentionally not shown — there is no real data for
  them. The `reviews` table exists for a future, genuine implementation.

## Troubleshooting

- **"Supabase is not configured" banner** → fill `.env` and restart the dev server (Vite/Expo read env at start).
- **Sign-up seems to do nothing** → email confirmation is on; disable it (above) or confirm the email then sign in.
- **Empty dashboards / no jobs** → run the seeder, or sign in as a demo user.
- **RLS "permission denied" errors** → confirm all four migrations ran, in order.
- **Mobile can't reach Supabase** → ensure `EXPO_PUBLIC_*` vars are set and restart Expo with `-c` to clear the cache.
- **Expo monorepo resolution issues** → `metro.config.js` already watches the workspace root; restart with `npx expo start -c`.

## Future roadmap

Designed-for, intentionally **not** implemented (no fake versions): AI matching,
seasonal demand forecasting, weather recommendations, voice assistant, digital
payments, equipment rentals, government integration, loans, crop insurance,
input marketplace, logistics, large analytics dashboards.

---

MIT licensed. Logo and brand belong to the AgriJoin project.
