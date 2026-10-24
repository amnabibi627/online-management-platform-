# Setup Guide

Online Management Site — `https://onlinemanagement.site`

Static site (HTML / CSS / JS). Cloudflare Pages host. Supabase Auth and
row-level-secured tables for category accounts, Owner/User accounts and reviews.
Business-ad requests/listings and explicit cashbook transactions also use
Supabase. Some presentation settings and local receipts still use `localStorage`.

Category-page feature workspaces require an approved, unexpired subscription
for that specific category. Records are stored in that account's category
`app_data` row and are not saved to browser-only storage. Supabase row-level
security checks the category subscription on every read and write, so paying
for one category does not unlock another.

Payments are manual: the customer sends JazzCash to `03042954627`, creates or
signs into an account, then submits the sender's mobile number and transaction
reference for the selected category and plan. The request remains pending until
the CEO checks the payment in JazzCash and approves it in **Super Admin →
Subscriptions**. Approval activates only the requested category; a renewal
extends its current expiry. Do not approve a request until the amount, sender,
and transaction reference match the JazzCash payment history.

The homepage **User Sign Up** also offers a paid category subscription request.
The user selects a category and plan and enters the JazzCash sender mobile and
transaction reference. This creates a pending request only; it does not grant
access until the CEO verifies and approves it in Super Admin → Subscriptions.

---

## 1. Supabase (one time)

### 1.1 Configure CEO email authentication and recovery

1. Supabase dashboard → **Authentication → Providers → Email**. Turn **Confirm
   email** OFF because Owner/Customer and category accounts use internal
   mobile-number aliases; the CEO setup needs an immediate authenticated
   session to claim CEO access after the details are verified.
2. In **Authentication → URL Configuration**, set the production site URL and
   add `https://onlinemanagement.site/**` to the allowed redirect URLs.
3. Configure a trusted SMTP provider under **Authentication → SMTP Settings**
   so CEO password-recovery messages reach the real email reliably.

### 1.2 Run the SQL

1. Supabase dashboard → **SQL Editor** → **New query**
2. Open the latest `supabase/setup.sql`, paste the entire file, press **Run**.
   Re-run the full file when deploying schema/policy updates; it is designed to
   be repeatable and does not delete existing customer or category records.

This creates:

- `public.admins` — the CEO table (with RLS, so a user can only read their own row;
  a unique index guarantees at most one CEO)
- A private one-time CEO bootstrap marker and database functions that compare
  the provided details against the configured identity and a stored secret hash.
- A server-side CEO availability check and CEO profile/email-management
  functions. No Edge Function deployment or service-role key is needed.
- `public.customer_profiles` and `public.owner_profiles` — account profiles linked to Supabase Auth
- `public.site_reviews` — public reviews with signed-in author and CEO-delete policies
- A CEO-only function for changing owner category access
- `public.category_subscriptions` — active/revoked, expiry-based access per user and category
- `public.subscription_requests` — private payment requests for customer and admin review
- CEO-only functions to atomically approve or reject a payment request
- A CEO-only account directory covering owners, category subscribers and site customers,
  with block/unblock controls and explicitly confirmed permanent deletion
- Account-access checks enforced by row-level security, not only by the browser UI
- CEO-only cloud category summaries and a read-only, selected-account/category
  record viewer
- `public.site_profile` — the owner photo shown to every visitor (anyone can read
  it, only an admin can write it)
- `public.business_ad_requests` — private registration and payment-review data
- `public.business_ads` — public, unexpired listings only
- A private `business-ad-media` Storage bucket with restricted upload policies
  and size/type validation
- CEO-only business-ad functions for payment verification, activation, extension,
  stopping and deletion
- `public.financial_transactions` — explicit owner cashbook entries, protected
  by per-user and per-category row-level security
- locks down `public.app_data` so category records also require an active
  subscription for that category (and the anonymous role cannot insert anything)

Re-run this setup SQL after deploying the subscription flow. New category
accounts cannot submit payment requests until the new tables and policies exist.
The updated setup also removes old client-side password hashes from synced
profile JSON without deleting the profile details.

After running the latest setup SQL, **Super Admin → Accounts** lists cloud
accounts and their owner categories, active subscriptions, pending payment
categories and blocked status. Blocking preserves records and prevents
account data access; restoring access re-enables it. Permanent deletion is a
separate action that requires entering the account email and removes the
account's authentication record and linked app data, subscriptions, payment
requests and reviews.

**Super Admin → Business Data** shows no tenant records until an account and
category are selected. The resulting view is read-only. Overview and Reports
use cross-account cloud totals rather than data stored in the CEO's browser.
Payments remain manual: check JazzCash before approving subscription requests
or marking a business-ad payment as received.

Existing Owner/User accounts created by the old browser-only login need a
one-time re-registration using the same mobile number and a new password. Their
old local account is not proof of identity and cannot be securely migrated.
Any profile or review data kept only in that browser remains there until the
CEO imports eligible legacy reviews during a CEO sign-in.

The old mobile-alias CEO login and manual admin-row activation are retired.
Owner/Customer and category accounts keep their existing mobile-alias login.

Owner/User and category accounts use the same mobile-number login (`mobile@bms.app`),
so someone who already has a category account can finish an Owner/User profile
by choosing **Create Account** and entering the same mobile number and password.
This setup does not verify phone-number ownership: configure a Supabase SMS OTP
provider before treating a mobile number as verified.

### 1.3 Configure one-time CEO setup and create the CEO account

This permanently deletes the old CEO's Supabase Auth user and rows cascaded
from that user (including their CEO profile, category subscriptions, and
user-owned records). It does not delete other users' accounts or records. Some
authored reviews may remain with the author reference cleared. This cannot be
undone.

1. The old CEO has been deleted. Apply the latest `supabase/setup.sql` in the
   SQL Editor. It adds the single-CEO constraint and enables setup readiness.
2. In **Supabase → SQL Editor → New query**, run this after replacing the
   placeholders with your exact CEO details and a private random setup secret
   of 32–256 characters:

   ```sql
   select public.configure_oms_ceo_bootstrap(
     'CEO_EMAIL',
     'CEO_FULL_NAME',
     '03XXXXXXXXX',
     'PASTE_A_PRIVATE_RANDOM_SECRET_HERE'
   );
   ```

   The database stores a bcrypt hash of the secret, not the original. The SQL
   query may remain in your Supabase query history, so do not share or save it
   where other people can read it. Never put the secret in website code or chat.
3. Deploy/publish the latest website code. Open **CEO Account → Create the
   one-time CEO account**. Enter the exact same name, email, and mobile, the
   secret you configured above, and a new password (8–72 characters). The
   website creates the Auth user, then the database verifies the secret and
   details and grants CEO access exactly once.
4. Sign out and sign in with the CEO email and password to verify access.
   Confirm that the Super Admin and Business Admin panels open.

If the create link is hidden, confirm the SQL setup and configuration query
both completed successfully. Never manually insert an `admins` row to bypass
the one-time claim.

Password recovery is available from the CEO login screen. It requires the
configured Supabase SMTP provider and the production redirect URL above. Make
sure the deployed domain is allow-listed before testing recovery.

After login, **CEO Account Settings** lets the CEO change name, email, phone, or
password. It requires the current password; email changes take effect after
confirmation at the new address.

### 1.4 Reviewing JazzCash payments

1. Open the **Owner Account** button on the home page and sign in as the CEO.
2. Open **Super Admin → Subscriptions**.
3. For each pending request, open JazzCash and confirm the transaction
   reference, sender mobile, and exact plan amount in your received-payment
   history.
4. Press **Verify & approve** only after all three details match. Approval
   starts or extends the subscription for that one category. Reject requests
   that cannot be verified.

The website does not verify JazzCash automatically. Never approve a request
based only on the customer's submitted reference or screenshot.

The category plans are PKR 3,000 for one month, PKR 9,000 for three months,
and PKR 12,000 for six months. A customer's same login may hold several
subscriptions, but every category must be purchased and approved separately.

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
payment is received. New registrations are cloud-backed. In the CEO **Business
Ads** panel, verify the payment in JazzCash, use **Payment Received**, then
activate the listing. The server rejects activation until payment has been
marked received. Public listings contain only approved display/contact details;
private owner and mobile details are not included. Stopping or expiring a
listing removes it from the public list and media links are only available
while the listing is active. Registration allows up to 30 JPG/PNG/WebP photos
(5 MB each) and 5 MP4/WebM videos (25 MB each). A fully populated listing can
use up to 275 MB; monitor Supabase Storage capacity and billing. Media is
removed when the CEO deletes the ad request. Previously issued signed links can
remain usable for up to 15 minutes after an ad is stopped or expires.

Older browser-only requests are imported once when the CEO opens Business Ads.
They are deliberately imported as pending, regardless of their old status, so
the CEO must re-check payment before publishing them.

The Owner **Business Admin Panel → Cashbook** stores explicit income and
expense transactions for the signed-in owner and allowed categories. Settled
income and paid expenses affect net cash; pending income and unpaid expenses
are reported separately. Old feature records are not treated as transactions
or automatically imported.

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

- The website does not block browser copy, print, or inspection controls.
  Client-delivered content cannot be reliably protected from copying.
- JazzCash payment checks are manual; the website does not connect to or
  automatically verify payments through a payment gateway.
- Business-ad media is uploaded to a private Supabase Storage bucket. Signed
  links expire after 15 minutes and are available only to the CEO for review or
  to the public while the ad is active. A link issued just before an ad stops
  or expires may continue working until it expires. Files remain stored until
  the CEO deletes the request.
- The cashbook tracks explicit cash transactions; it is not double-entry
  accounting or a tax/accounting system. Its totals depend on complete,
  accurate entries, and existing feature records are not backfilled.
