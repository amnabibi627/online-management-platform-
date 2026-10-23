# Setup Guide

Online Management Site — `https://onlinemanagement.site`

Static site (HTML / CSS / JS). Cloudflare Pages host. Supabase for auth and
cloud sync. `localStorage` for offline work.

Category-page feature workspaces require a signed-in Supabase account. Their
records are stored under the account's `app_data` row for that category and are
not saved to browser-only storage. The `app_data` row-level security policy in
`supabase/setup.sql` limits access to the authenticated account owner.

---

## 1. Supabase (one time)

### 1.1 Turn off email confirmation

1. Supabase dashboard → **Authentication** → **Email**
2. Turn **Confirm email** OFF

Accounts are keyed by mobile number, so the app signs in with
`mobile@bms.app` as the email. Confirmation links would block that.

### 1.2 Run the SQL

1. Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/setup.sql`, paste it, press **Run**

This creates:

- `public.admins` — the CEO table (with RLS, so a user can only read their own row)
- `public.site_profile` — the owner photo shown to every visitor (anyone can read
  it, only an admin can write it)
- locks down `public.app_data` (only the owner of a row can read or write it, and
  the anonymous role cannot insert anything)

### 1.3 Make your own account the CEO

In the same SQL editor, run this with **your own** email (your mobile number
plus `@bms.app`):

```sql
insert into public.admins (user_id, email, role)
select id, email, 'ceo' from auth.users where email = '03042954627@bms.app'
on conflict (user_id) do nothing;
```

Check it worked:

```sql
select user_id, email, role from public.admins;
```

> If the insert returns 0 rows, the account does not exist yet. Open the site,
> sign up with that mobile number first, then run the insert again.

---

## 2. Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick this repository, branch `main`
3. Build settings: **Framework preset = None**, build command *(leave empty)*,
   output directory `/`
4. **Save and Deploy**

The `_headers` file is picked up automatically and applies these headers to every
response:

| Header | What it does |
|---|---|
| `Content-Security-Policy` | Only approved scripts/styles may load (no inline scripts) |
| `Strict-Transport-Security` | Forces HTTPS for two years |
| `X-Frame-Options` / `frame-ancestors 'none'` | Blocks clickjacking |
| `X-Content-Type-Options: nosniff` | Blocks MIME sniffing |
| `Referrer-Policy` | Limits referrer leaking |
| `Permissions-Policy` | Geolocation, camera and microphone locked down |

### 2.1 Custom domain

1. Pages project → **Custom domains** → **Set up a custom domain**
2. Enter `onlinemanagement.site`
3. Cloudflare adds the DNS record automatically (zone is on the same account)

`www.onlinemanagement.site` needs its own record. Add a **CNAME** record:
name `www`, target `onlinemanagement.site`, proxy **Proxied**.

---

## 3. After every code change

`script.js`, `styles.css` and `liveads.js` are served with
`max-age=0, must-revalidate`, so the browser always checks the server first.
Even so, bump the version query string in `index.html` so every visitor gets the
new file instantly, with no chance of a stale cached copy:

```html
<link rel="stylesheet" href="styles.css?v=20260422e" />
<script src="script.js?v=20260422e"></script>
```

Then commit and push. Cloudflare Pages deploys automatically (usually 1 to 3
minutes). If the live site still shows the old version, do a hard refresh
(`Ctrl + Shift + R`) once.

---

## 4. Owner WhatsApp for ad payments

Owner number: **0304 295 4627** → `https://wa.me/923042954627`

Plans:

| Plan | Days | Price |
|---|---|---|
| 15 days | 15 | PKR 2,500 |
| 30 days | 30 | PKR 5,000 |
| 1 year | 365 | PKR 60,000 |

Ads stay inactive until the CEO activates them from the CEO panel after the
payment is received.

---

## 5. Owner photo (DP)

The photo in the header circle is kept in three places, so it cannot disappear
on its own:

- `localStorage` — fast, on the device that picked it
- IndexedDB `oms_media` — survives a cleared cache or a full `localStorage`
- Supabase `app_data` row `ownerAvatar` — follows the owner to other devices

When the CEO is signed in, the photo is also written to `public.site_profile`.
That is the copy every visitor sees, so run the SQL from section 1.2 to create
the table.

Pick the photo from the header circle or from the Owner Details section. It is
resized to 512 px and saved as a small JPEG, so it always fits and never slows
the page down.

---

## 6. Housekeeping

Things that still need a manual action once:

- **Delete the test auth user** `sec-audit-probe-20261021@bms.app`
  (Supabase → Authentication → Users → delete)
- **Delete the sample Pages project** named `my-site` if it is not being used
- **Check the CSP console** — after adding `https://static.cloudflareinsights.com`
  to `script-src` the Cloudflare analytics beacon loads without errors

---

## 7. Known limits

- Anyone can still take a **screenshot** or **screen record**. Anti copy stops
  casual copying only.
- Live ads are read from the visitor's own `localStorage` right now, so ads
  registered in one browser are not visible in another. A shared public table
  is needed for that.
- The financial ledger uses a label heuristic, so some totals can drift.
