# Architecture

This is a static site: plain HTML, CSS and JavaScript. There is **no build
step, no bundler and no package manager**. Whatever is in the repository is what
the browser downloads.

The goal of this document is to explain how the pieces fit together so a change
can be made in the right file without breaking load order or data access.

---

## 1. Page types

There are three kinds of page.

| Kind | Files | Shared entry points |
|---|---|---|
| Home page | `index.html` | `assets/css/styles.css` + `assets/css/pages/home-signup-modal.css`, `assets/js/home/01..19` |
| Category pages | `clinic.html`, `academy.html`, `restaurant.html`, `generalstore.html`, `beautysalon.html`, `petrolpump.html`, `medicalstore.html`, `laboratory.html` | `assets/css/styles.css` + `assets/css/category.css`, `assets/js/category/01..14` |
| Standalone pages | `signup.html`, `404.html` | `assets/css/signup.css` / inline styles only |

Every page also loads, before its own scripts:

1. `assets/js/security.js` - browser-side guards and console warning.
2. The Supabase JavaScript client from jsDelivr (home and category pages only).
3. `assets/js/feature-registry.js` - category catalog, feature fields, Supabase
   client and shared helpers. It publishes everything on
   `window.OMS_FEATURE_MODULES`.

`assets/js/ui.js` runs last on both home and category pages. It only wires
scroll progress, back-to-top, reveal animations and simple page interactions.

### Why pages stay at the repository root

The public URLs (`/clinic`, `/clinic.html`, `/academy`, ...) are indexed and
linked from the home page, sitemap and canonical tags. Moving the HTML into a
subfolder would change every URL. Only CSS, JS and images live under `assets/`.

---

## 2. CSS: entry files + ordered partials

There are two entry stylesheets:

- `assets/css/styles.css` - base design tokens, header, buttons, hero, shared
  home sections and components. Loaded by the home page **and** every category
  page, because category pages reuse the header, footer and modals.
- `assets/css/category.css` - category-only layout and workspaces. Loaded after
  `styles.css` so it can override shared rules.

Both entries contain only `@import` statements. The partials are numbered and
must stay in numeric order because this is a cascade, not a component system:

```text
assets/css/home/01-foundation.css      tokens, reset, header, nav, buttons
assets/css/home/02-hero.css            hero band and dashboard preview
assets/css/home/03-home-sections.css   sections, industry cards, reviews
assets/css/home/04-modals-and-panels.css
assets/css/home/05-super-admin.css
assets/css/home/06-business-ads.css
assets/css/home/07-device-showcase.css
assets/css/home/08-subscription-and-account.css
assets/css/home/09-saas-and-legal.css
assets/css/home/10-signup-modal.css
assets/css/home/11-late-overrides.css  intentionally late overrides

assets/css/category/01-category-shell.css
assets/css/category/02-workspace.css
assets/css/category/03-global-rules.css
assets/css/category/04-saas-portal.css
assets/css/category/05-safety-and-buttons.css
assets/css/category/06-table-and-kpi.css
assets/css/category/07-analytics-and-profile.css
assets/css/category/08-enterprise-extensions.css
assets/css/category/09-legal-phone-whatsapp.css
```

Rules:

- Edit a partial, never the import list, unless you are adding a new section.
- A new section goes at the **end** of the relevant entry so existing overrides
  keep winning.
- `assets/css/pages/` is for styles used by exactly one page. Today that is the
  home sign-up modal (`home-signup-modal.css`), loaded only by `index.html`.
- `assets/css/signup.css` belongs only to `signup.html`.
- Do not rename numbered partials. The numbers are the load contract.

---

## 3. JavaScript: classic scripts sharing one global scope

All page scripts are classic `<script src="...">` tags, not ES modules. That
means every top-level `const`, `let`, `function` and `var` lives in the same
global lexical scope. **Order is the dependency graph.**

```text
index.html
  security.js
  feature-registry.js        -> window.OMS_FEATURE_MODULES
  home/01-core-utilities.js
  home/02-supabase-client.js -> sb, CLOUD_TABLE
  home/03-security.js
  home/04-cloud-sync.js
  ...
  home/19-user-profile.js
  liveads.js
  ui.js

clinic.html (and the other 7)
  security.js
  feature-registry.js
  category/01-config.js
  category/02-category-catalog.js -> CATEGORIES
  category/03-page-state.js      -> CURRENT, categoryData
  ...
  category/14-page-init.js
  ui.js
```

### Invariants

1. **Never reorder script tags.** A later file uses values created by an earlier
   file at load time (for example `CURRENT` is read from `CATEGORIES` in
   `category/03-page-state.js`).
2. **Never introduce a duplicate top-level name.** Because all files share one
   scope, a second `const showToast` in another partial is a hard
   `SyntaxError` that stops the whole page. Prefix new helpers with the page
   area (`category...`, `review...`, `owner...`) or attach them to an object.
3. **Do not convert a partial to a module.** `type="module"` changes scoping and
   would break every cross-file reference.
4. **Keep the numeric prefix.** Add a new file only at the end of a page's
   sequence, or renumber deliberately and update the HTML in the same commit.
5. **No build step.** Browser support must match what you write: plain ES2020,
   no TypeScript, no JSX, no bare imports.

The home and category splits are intentionally feature-based, not one file per
function. Each partial owns one area of the page and exports its helpers
implicitly to the next file.

---

## 4. Home page data flow

`index.html` contains the markup for every panel: header, hero, category cards,
owner/user modals, CEO panel, Super Admin, business ads, reviews and footer.

At runtime the home scripts:

1. Create the Supabase client (`home/02-supabase-client.js`) and restore any
   session (`home/04-cloud-sync.js`).
2. Load and persist browser state in `localStorage` (see the key table below).
3. Keep the CEO state in `ceoLoggedIn` / `ceoMode`, verified against the
   `admins` table through RPCs, never by the browser alone.
4. Write user-owned cloud data to the `app_data` table using
   `user_id + key` rows, and read it back on sign-in.
5. Render reviews from `site_reviews`, business ads from `business_ad_requests`
   / `business_ads`, and the public owner photo from `site_profile`.

`assets/js/liveads.js` is separate from `home/17-business-ads.js` on purpose:
the first renders the public listing grid for every visitor, the second is the
CEO-only review/activation panel.

---

## 5. Category page data flow

A category page is a small HTML shell. Almost all content is rendered from
`assets/js/feature-registry.js` and `assets/js/category/02-category-catalog.js`.

```text
<body data-category="clinic">
        |
        v
category/02  CATEGORIES[clinic]  -> title, copy, icon, feature list
category/03  CURRENT              -> resolved category, SEO tags, state
category/04  access rules         -> trial, subscription, CEO bypass
category/05  trial / signup modal
category/06  sign-in + paywall
category/07  records             -> Supabase app_data row "<category>:data"
category/08  backup / CSV / print
category/09  safety modals
category/10  SaaS shell (sidebar, top bar, KPIs)
category/11  record list + entry form
category/12  open a feature
category/13  per-feature actions and event wiring
category/14  related categories + bootstrap
```

Key facts:

- The category is selected by `document.body.dataset.category`; the key must
  exist in `CATEGORIES`.
- Each feature is defined once in `feature-registry.js` (fields, labels, types,
  validation). The category page only renders it.
- Records live under `categoryData.features[featureId]` and deleted records
  under `categoryData.trash[featureId]`.
- The same object is cached in `localStorage` and synced to Supabase row
  `key = "<category>:data"` for the signed-in user.
- Access is enforced by Supabase row-level security via
  `oms_can_access_category(category)`. Hiding UI is not security.

---

## 6. Database and server-side rules

The schema lives in `supabase/setup.sql`. It is idempotent: re-running the whole
file is the supported way to apply updates.

Main tables:

| Table | Purpose |
|---|---|
| `admins` | Single CEO account, RLS-protected |
| `oms_account_access` | Blocked / active account state |
| `customer_profiles`, `owner_profiles` | Account profiles linked to Supabase Auth |
| `site_reviews` | Public ratings, comments, CEO replies |
| `category_subscriptions` | Active / expired access per user and category |
| `subscription_requests` | Manual JazzCash payment requests |
| `app_data` | Per-user JSON records, including category workspace data |
| `financial_transactions` | Explicit cashbook income / expense entries |
| `site_profile` | Public owner photo |
| `business_ad_requests`, `business_ads` | Private ad requests and public listings |

All sensitive operations (CEO claim, subscription approval, ad activation,
account blocking/deletion, cross-account data reads) are database functions
that check `public.is_oms_admin()` server-side. The browser never holds a
service-role key.

---

## 7. Browser storage keys

Only these keys are used directly. Anything else belongs to the cloud.

| Key | Written by | Meaning |
|---|---|---|
| `ceoLoggedIn`, `ceoMode` | home CEO scripts | Cached CEO session flag and scope |
| `ownerAvatar` | home avatar script | Fast local copy of the owner photo |
| `siteReviews` | home reviews | Legacy / optimistic review cache |
| `businessRegistrations`, `selectedBizPlan`, `businessAdReceipts` | home registration | Draft ad request, chosen plan, local receipts |
| `bms_user_trial`, `oms_trial_account` | user/trial scripts | Trial account mirror (both kept for compatibility) |
| `oms_registered_users` | user auth | Legacy local account list (not proof of identity) |
| `oms_attempts_<key>` | home security | Login throttling counters |
| `oms_subscription_requests`, `oms_active_subscriptions` | super admin | Cached subscription lists |
| `oms_global_currency` | category state | Selected display currency |
| `bms_cat_<category>_data_v2` | category workspace | Local cache of that category's records |

Never store passwords, payment proofs or service keys in `localStorage`.

---

## 8. Caching and deployment

The site is deployed on Cloudflare Pages from the repository root. `_headers`
sets security headers and `Cache-Control` rules:

- HTML: `max-age=0, must-revalidate`.
- `/assets/css/*` and `/assets/js/*`: `max-age=0, must-revalidate`.
- `/assets/img/*`: one day, with `?v=` in the markup.

Asset URLs carry a shared version string, currently
`?v=20261115Organized`. After a production change, bump that string in every HTML
file so browsers and the Cloudflare edge fetch the new files immediately. The
exact steps are in `SETUP.md` section 3.

There is no minification or transpilation step. Keep source files readable; the
site ships them as written.

---

## 9. Where to look first

| Question | File |
|---|---|
| What fields does a feature have? | `assets/js/feature-registry.js` |
| How is a category page assembled? | `assets/js/category/03-page-state.js` and `11-render-list-and-form.js` |
| How does sign-in work? | `assets/js/home/08-user-auth-modal.js`, `09-ceo-account.js`, `assets/js/category/06-auth-and-paywall.js` |
| Why can a user see a category? | `supabase/setup.sql` (`oms_can_access_category`, RLS policies) |
| How is an ad published? | `assets/js/home/17-business-ads.js` + `business_ads` RPCs |
| What will break if I reorder scripts? | Everything. Read section 3. |

For a per-file description, see [`FILE-MAP.md`](FILE-MAP.md). For edit rules and
checklists, see [`CONTRIBUTING.md`](CONTRIBUTING.md).
