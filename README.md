# Business Management System

All-in-one business management web app — a static HTML/CSS/JavaScript site.
Category workspaces, homepage Owner/User accounts, business-ad requests/listings,
and the cashbook use Supabase; some presentation settings and local-only tools
still rely on browser storage.

## Features

- **CEO access** — Supabase Auth login with server-side admin-role verification
- **Owner accounts** — sign up with a business category, restricted access to that category only
- **8 industry categories** — Clinic, Academy, Restaurant, General Store, Beauty Salon,
  Petrol Pump, Medical Store, Laboratory — each with 12 working CRUD modules
- **Custom categories** — CEO can add new categories with generic modules
- **Feature modules** — add, edit, delete entries with per-feature validation
- **Entry count badges** on every feature card
- **Per-category "All Data" sheet** — Excel-like view of every saved entry with search,
  row-level edit/delete and CSV export
- **Owner profile** — header + profile photo (DP) upload, bio, contact links
  (Facebook, Instagram, TikTok, WhatsApp, Email) and an embedded portfolio viewer.
  The photo is resized to 512 px and stored in three places (localStorage,
  IndexedDB and the cloud), so it can no longer disappear on its own. When the
  CEO is signed in it is also published to `site_profile`, which is the copy
  every visitor sees
- **User accounts** — a real "User Sign Up" page in the header (separate from the
  Owner Account button). Users fill in full name, mobile, email, city, password
  and confirm password, then sign in to post ratings and comments. Clicking the
  "Your Name" box in the reviews section opens the same signup page
- **Ratings & comments** — only signed-in users can post a 1–5 star rating and a
  comment; average score and star distribution shown live. A user can delete only
  their own review, the CEO can delete any review
- **Business registration** — a "Register Your Business" card opens a compact
  modal form with three paid plans (15 days / PKR 2,500, 30 days / PKR 5,000,
  1 year / PKR 60,000) picked inside the form. Requests are saved in Supabase;
  owner and payment details are private. Payment is manually verified by the
  CEO before the listing can be activated. WhatsApp opens with a request
  reference for payment follow-up
- **Business Ads panel** (CEO only) — review every registration, confirm the
  payment, then activate the ad. Server-side CEO-only operations enforce this
  order. Expiry is set from the plan (15 days / 30 days / 1 year), with extend,
  stop, re-activate and delete actions
- **Running Business Ads** — a public section that lists every activated ad in
  card format with public business details, social links and WhatsApp contact.
  Listings are shared across devices and automatically hidden after expiry.
  Photos and MP4/WebM videos are stored privately and become viewable only
  after payment verification and CEO activation (up to 30 photos at 5 MB each
  and 5 videos at 25 MB each)
- **Cashbook** — explicit per-account, per-category income and expense entries
  stored in Supabase. Received/paid totals, receivables, unpaid expenses and
  net cash are reported separately; operational feature records are never
  guessed to be financial transactions
- **Category subscriptions** — each category requires its own subscription:
  PKR 3,000/month, PKR 9,000/3 months, or PKR 12,000/6 months. JazzCash
  payments are manually checked by the CEO before access is approved
- **Category workspace cloud storage** — Supabase Auth and per-account cloud
  data for subscribed category workspaces

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, category sections, modals |
| `script.js`  | Homepage auth, CRUD, sync, reviews and admin logic |
| `category.js` / `category.css` | Category page subscriptions, workspaces and styling |
| `feature-registry.js` | Category tools, form fields and Supabase client |
| `liveads.js` | Renders the public "Running Business Ads" cards |
| `styles.css` | Styling |
| `_headers` | Cloudflare Pages security headers (CSP, HSTS, frame options) |
| `CNAME` | Custom domain `onlinemanagement.site` |
| `supabase/setup.sql` | Admin, subscriptions, business ads, cashbook, sync tables and row level security |
| `SETUP.md` | Step by step deployment and security setup guide |

## Running

Just open `index.html` in a browser — no build step, no dependencies.

The app loads Supabase from a CDN. Home-page features that use `localStorage`
remain available on that browser without a connection. Category workspace
sign-in and data, Owner/User accounts, CEO access, public reviews, business-ad
requests/listings, and the cashbook require Supabase. Supabase-backed features
cannot sign in or save/load cloud records while the service is unavailable;
browser-local features remain limited to that device.

## Security and current limits

- **Category workspace access** is enforced by Supabase row-level security:
  every category needs its own active subscription. The CEO approval functions
  also check the admin role on the server.
- **Owner and User credentials use Supabase Auth.** Their profile records and
  public reviews are stored in Supabase tables protected by row-level security.
  Old browser-only account records are not accepted as proof of identity.
- **JazzCash payments are manual.** The CEO checks the payment in JazzCash and
  approves the request in the admin panel. The site does not have payment-gateway
  verification.
- **Business ad payments remain manual.** An owner must confirm each payment
  in JazzCash. A paid request does not become public until the CEO activates it.
  Legacy browser-only requests are imported as pending and must be re-verified.
- **Ad media uses Supabase Storage.** Uploaded files are private before
  activation and delivered with short-lived signed links only while the ad is
  active. Previously issued links can remain usable for up to 15 minutes after
  an ad is stopped or expires. Media remains stored until the CEO deletes its
  request; Supabase storage capacity and billing limits still apply.
- **The cashbook is an explicit cash-tracking tool, not double-entry
  accounting.** Older feature records are not imported as transactions, and
  cashbook totals are only as complete as the transactions the user records.
- **CSP and transport headers** are configured through `_headers`; production
  behavior depends on deploying through a host that applies those headers.
- **Browser content restrictions are not security.** The site does not block
  copy, printing, or DevTools; those browser features cannot reliably protect
  client-delivered content.

Full instructions are in [SETUP.md](SETUP.md).

## Supabase setup

The client uses a public project URL and publishable key (safe for client side use).
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

Run [`supabase/setup.sql`](supabase/setup.sql) once to create the CEO `admins`
table, the public `site_profile` table and lock down `app_data`.
