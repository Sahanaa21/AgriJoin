# AgriJoin — Architecture

## Overview

AgriJoin is an npm-workspaces monorepo with four code packages and a database
package:

- `packages/shared` — framework-agnostic domain code shared by every app:
  TypeScript types mirroring the DB, Zod validation schemas, constants (crops,
  skills, states, statuses), the haversine distance helper, and the "best match"
  scoring function. Unit-tested with Vitest.
- `apps/web` — React + Vite website.
- `apps/mobile` — React Native + Expo app (Expo Router).
- `apps/api` — optional thin Express API.
- `supabase/` — SQL migrations, RLS policies, functions, views, and seed data.

Both client apps use the **same** Supabase project, so all data is shared.

## Data model

| Table | Purpose | Key rules |
|-------|---------|-----------|
| `profiles` | public identity (name, general location) | 1 row per auth user; no phone/email |
| `user_contacts` | phone number | owner-only; consented sharing via RPC |
| `farmer_profiles` | farm details | 1:1 with profiles; owner-only |
| `labourer_profiles` | skills, availability, expected wage, coords | owner + farmers who received an application |
| `jobs` | job postings | owned by a farmer; `workers_needed > 0`, `end_date >= start_date`, `wage >= 0` |
| `job_applications` | labourer → job | `UNIQUE(job_id, labourer_id)` prevents duplicates |
| `conversations` / `conversation_participants` / `messages` | messaging | participants-only access |
| `notifications` | per-user notices | owner-only |
| `reviews` | ratings (future) | real rows only; never fabricated |

A view `jobs_with_farmer` (`security_invoker = true`) joins each job to its
farmer's public name/location and a live `accepted_count`, without widening
access.

## Why the Express API is thin (and optional)

The brief lists an Express API, and also asks to flag redundancy. Here is the
reasoning and the decision:

- Supabase already gives us authentication, a data API (PostgREST), and
  **row-level authorization** (RLS). A conventional CRUD API on top of that would
  re-implement the same reads/writes and the same access checks — duplication
  that a student then has to keep in sync in two places.
- The operations that genuinely need server-side guarantees are **transactional
  business rules** RLS cannot express on its own:
  - applying to a job atomically (role check + job open + no duplicate),
  - accepting an application **without overbooking** (lock the job row, re-check
    capacity),
  - job status transitions restricted to the owner,
  - sharing a phone number only with consent.
- These live as **PostgreSQL `SECURITY DEFINER` functions** (`supabase/migrations/0003_functions.sql`),
  callable as RPCs by any client. They run on the database, so the rules hold for
  the website, the mobile app, and the API alike — one source of truth.

So the clients call Supabase (and these RPCs) **directly**, protected by RLS.
`apps/api` is a small optional layer: it verifies the caller's JWT and forwards
to the same RPCs using a user-scoped client (never the service role for user
actions). It exists to demonstrate the pattern and to host future privileged
logic (webhooks, admin tasks, third-party integrations). **The apps are fully
functional without it.**

## "Best match" ranking (deterministic, not AI)

`packages/shared/src/matching.ts` computes a 0–100 score as a weighted sum of
four normalised factors — this is a transparent formula, not machine learning:

| Factor | Weight | How |
|--------|--------|-----|
| Skill relevance | 0.40 | overlap of labourer skills/preferences with the job's category + crop |
| Proximity | 0.30 | closer is better within a 50 km horizon; unknown distance → neutral 0.5 |
| Wage | 0.20 | higher wage vs the labourer's expected wage (or ₹1000/day reference) |
| Recency | 0.10 | newer postings score higher over a 14-day window |

Same inputs always yield the same score, and the per-factor breakdown is
returned so the UI can explain a ranking. Distance- and match-based sorts operate
on the fetched page; the other sorts (recent, highest wage, starting soon) are
ordered in SQL.

## Maps & location

- **Website:** Leaflet + OpenStreetMap tiles. Markers are **job locations** only
  (farmer-published). The map never plots other users' precise personal
  coordinates. Distances are shown only when real coordinates exist.
- **Mobile:** a distance-sorted **list** ("Live Map" tab). An interactive native
  map (`react-native-maps`) needs a custom Expo **dev build** and a Google Maps
  API key, which Expo Go cannot provide. Rather than present a fake/static map,
  the app shows the same data as a list. Upgrade path: `npx expo install
  react-native-maps`, add the Maps API key via an Expo config plugin, and build
  with EAS.
- Device location is always opt-in (browser Geolocation / `expo-location`), with
  manual entry and a graceful denied state.

## Request/auth flow

1. User signs in with Supabase Auth → receives a JWT, persisted (localStorage on
   web, AsyncStorage on mobile).
2. Client queries Supabase with the anon key; the JWT identifies the user, and
   RLS filters every row by `auth.uid()`.
3. Transactional actions call RPCs; the functions re-derive identity from
   `auth.uid()` and enforce the business rules.
4. (Optional) The same actions can be routed through `apps/api`, which verifies
   the JWT server-side and calls the RPCs with a user-scoped client.

## Mobile build note

Expo Go is enough to run and demo the app during development. A distributable
Android build (APK/AAB) uses **EAS Build** (`npx eas build -p android`), which
requires an Expo account and runs a cloud build; adding native modules such as
`react-native-maps` requires this dev/build step rather than Expo Go.
