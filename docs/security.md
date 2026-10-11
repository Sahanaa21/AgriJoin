# AgriJoin — Security model

Authorization is enforced in the **database**, not just the UI. The client
guards (protected routes, hidden buttons) are only for UX; a user who bypasses
them still cannot read or write data they don't own, because every table is
protected by PostgreSQL Row Level Security (RLS).

## Principles

1. **Never trust the client for identity.** Policies and functions use
   `auth.uid()` (from the verified JWT), never a user id supplied in a request.
2. **Least privilege.** The `anon` role has no table access — the marketplace
   requires sign-in. `authenticated` gets table access filtered by RLS.
3. **Service-role key stays server-side.** It bypasses RLS and is only used by
   the optional API and the seeder. It is never in a web/mobile bundle, and
   `.gitignore` blocks `.env*`.
4. **Defense in depth.** Duplicate applications are blocked by a `UNIQUE`
   constraint *and* checked in the apply RPC. Overbooking is prevented by row
   locking + capacity re-check in the accept RPC.

## Row Level Security summary

| Table | Read | Write |
|-------|------|-------|
| `profiles` | any authenticated user (public identity only) | owner (`id = auth.uid()`) |
| `user_contacts` (phone) | **owner only**; others via `get_shared_contact()` with consent | owner |
| `farmer_profiles` | owner | owner |
| `labourer_profiles` | owner, or a farmer who received an application from them | owner |
| `jobs` | open jobs (anyone), own jobs (farmer), applied jobs (labourer) | insert/update/delete by owner; insert requires `role = 'farmer'` |
| `job_applications` | the labourer who made it, or the job's farmer | labourer inserts own `pending` to an open job; labourer or job-farmer may update |
| `conversations` / `participants` / `messages` | participants only (via `is_conversation_participant()`) | participants only; sender must be `auth.uid()` |
| `notifications` | owner | owner |
| `reviews` | any authenticated user | reviewer must have taken part in the job |

Recursive-policy pitfalls (a policy querying its own table) are avoided with
`SECURITY DEFINER` helper functions: `is_conversation_participant()`,
`owns_job()`, `current_role_is()`.

## Phone-number privacy

The brief requires not exposing phone numbers without consent. Because Postgres
RLS is row-level (it can't hide a column), the phone is stored in a **separate
table** `user_contacts` instead of `profiles`:

- `user_contacts` RLS: **owner-only** read/write.
- A counterparty obtains a phone only through `get_shared_contact(p_user)`, a
  `SECURITY DEFINER` function that returns the number **only** when there is
  consent — an accepted/completed application between the two users, or a shared
  conversation — and `null` otherwise.

Precise personal coordinates are likewise never placed on a public map; the map
shows farmer-published **job** locations only.

## Transactional functions (SECURITY DEFINER)

Defined in `supabase/migrations/0003_functions.sql`:

- `apply_to_job(job_id, message)` — verifies labourer role, job open & not
  expired, no duplicate; inserts a pending application; notifies the farmer.
- `set_application_status(application_id, status)` — authorises the actor
  (labourer may withdraw own; farmer may accept/reject/complete own job's
  applications); on **accept** it locks the job row and re-checks capacity to
  prevent overbooking, and auto-marks the job `filled` when full; notifies the
  labourer.
- `set_job_status(job_id, status)` — owner-only lifecycle transitions.
- `get_or_create_conversation(other_user, job_id)` — finds/creates a 1:1
  conversation and adds both participants.
- `get_shared_contact(user)` — consented phone lookup (above).

Each function sets `search_path = public` and checks `auth.uid()` first.

## What is intentionally not done

- No phone OTP / SMS (no provider configured) — not faked.
- No service-role usage from clients.
- No fabricated ratings, earnings, or "online now" counts.
- Email confirmation is left to Supabase settings; disable it only for local
  demos, keep it on for production.
