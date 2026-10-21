# Business Management System

All-in-one business management web app — a static HTML/CSS/JavaScript site with
Supabase cloud sync (auth + data) and a full offline fallback via localStorage.

## Features

- **CEO master account** — registration locked behind a secret code, login/logout, reset
- **Owner accounts** — sign up with a business category, restricted access to that category only
- **8 industry categories** — Clinic, Academy, Restaurant, General Store, Beauty Salon,
  Petrol Pump, Medical Store, Laboratory — each with 12 working CRUD modules
- **Custom categories** — CEO can add new categories with generic modules
- **Feature modules** — add, edit, delete entries with per-feature validation
- **Entry count badges** on every feature card
- **Per-category "All Data" sheet** — Excel-like view of every saved entry with search,
  row-level edit/delete and CSV export
- **Owner profile** — header + profile photo (DP) upload, bio, contact links
  (Facebook, Instagram, TikTok, WhatsApp, Email) and an embedded portfolio viewer
- **Ratings & comments** — any visitor can rate 1–5 stars and leave a comment;
  average score and star distribution shown live
- **Guides & updates** — tag filters (Guide, Update), read more/less and
  paginated posts (2 per page)
- **Business registration** — a "Register Your Business" card opens a compact
  modal form with three paid plans (15 days / PKR 2,500, 30 days / PKR 5,000,
  1 year / PKR 60,000) picked inside the form. All details are required, plus
  optional website and social links (Facebook, Instagram, TikTok). After
  submitting, the owner's WhatsApp opens with the business and plan pre-filled
  so the customer can send the payment
- **Business Ads panel** (CEO only) — review every registration, confirm the
  payment, then activate the ad. Expiry is set from the plan automatically
  (15 days / 30 days / 1 year), with extend, stop and delete actions. Expired
  ads drop out of the live list on their own
- **Running Business Ads** — a public section that lists every activated ad in
  Fiverr gig style (thumbnail, seller row, title, meta, links, "Starts from
  PKR X" price and a green Contact button that opens WhatsApp). Ads show up
  only while they are live
- **Supabase sync** — data and auth synced to the cloud; works offline too (localStorage)

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, category sections, modals |
| `script.js`  | All app logic (auth, CRUD, sync) |
| `liveads.js` | Renders the public "Running Business Ads" cards |
| `styles.css` | Styling |

## Running

Just open `index.html` in a browser — no build step, no dependencies.

The app loads Supabase from a CDN. Where Supabase is unreachable (network-level
blocking), everything still works locally in `localStorage` and syncs automatically
once the connection is restored.

## Supabase setup

The client uses a public project URL and publishable key (safe for client-side use).
Database schema:

```sql
create table public.app_data (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table public.app_data enable row level security;
create policy "own data" on public.app_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Email confirmation must be disabled (Authentication → Email → Confirm email OFF)
because accounts are keyed by mobile number.
