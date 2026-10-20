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
- **Supabase sync** — data and auth synced to the cloud; works offline too (localStorage)

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, category sections, modals |
| `script.js`  | All app logic (auth, CRUD, sync) |
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
