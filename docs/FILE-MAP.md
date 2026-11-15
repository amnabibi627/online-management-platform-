# File map

One line per file, grouped by area. Paths are relative to the repository root.

If you are looking for a feature, search this file first, then open the listed
file. Cross-cutting rules live in [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Root pages

| File | Purpose |
|---|---|
| `index.html` | Home page: hero, 8 category cards, owner/user sign-up, CEO panel, Super Admin, business ads, reviews, footer. Also lists all home CSS/JS in load order. |
| `clinic.html` | Clinic category shell (`data-category="clinic"`). |
| `academy.html` | Academy category shell. |
| `restaurant.html` | Restaurant category shell. |
| `generalstore.html` | General store category shell. |
| `beautysalon.html` | Beauty salon category shell. |
| `petrolpump.html` | Petrol pump category shell. |
| `medicalstore.html` | Medical store category shell. |
| `laboratory.html` | Laboratory category shell. |
| `signup.html` | Standalone phone sign-up page (separate from the home modal). |
| `404.html` | Not-found page. |
| `favicon.svg` | Site icon. |

The eight category pages differ only in `data-category`, title/meta and their
static fallback copy. A copyable template lives in
`docs/templates/category-page-template.html`.

## Root configuration

| File | Purpose |
|---|---|
| `_headers` | Cloudflare Pages security headers (CSP, HSTS, frame policy) and cache rules for HTML, CSS, JS and images. |
| `CNAME` | Custom domain: `onlinemanagement.site`. |
| `robots.txt` | Allows all crawlers and points to the sitemap. |
| `sitemap.xml` | Public URL list for search engines. |
| `.editorconfig` | UTF-8, LF, 2-space indentation, final newline. |
| `.gitattributes` | Normalises text files to LF; marks images as binary. |
| `.gitignore` | Ignores OS/editor noise and local tooling folders. |
| `README.md` | Project overview, features, structure and "where to start". |
| `SETUP.md` | Supabase, Cloudflare, cache-busting, payments and housekeeping. |

## Database

| File | Purpose |
|---|---|
| `supabase/setup.sql` | Complete idempotent schema: tables, indexes, RLS policies, storage bucket and all `admin_*` / `oms_*` RPCs. Re-run the whole file to update. |

---

## `assets/css/`

### Entry files

| File | Purpose |
|---|---|
| `styles.css` | Home entry point. Imports `home/01..11` in cascade order. Also loaded by category pages for shared header/footer/modal styles. |
| `category.css` | Category entry point. Imports `category/01..09` after `styles.css`. |

### Home partials (`assets/css/home/`)

| File | Purpose |
|---|---|
| `01-foundation.css` | Design tokens, reset, base layout, header, navigation, buttons. |
| `02-hero.css` | Hero band, dashboard preview card, smart hub showcase. |
| `03-home-sections.css` | Home sections, industry cards, category detail, owner block, reviews. |
| `04-modals-and-panels.css` | Owner/user modals, CEO panel, footer, mobile nav, feature panels. |
| `05-super-admin.css` | CEO Super Admin console. |
| `06-business-ads.css` | Business registration form and live business ads. |
| `07-device-showcase.css` | Accessibility layer, device mockups, hero device image. |
| `08-subscription-and-account.css` | Subscription modal, global theme rules, profile pill. |
| `09-saas-and-legal.css` | Account profile modal, SaaS module, payments, legal modal, phone input. |
| `10-signup-modal.css` | Global sign-up modal card (shared). |
| `11-late-overrides.css` | Intentionally late overrides: registration refresh, category thumbnails, WhatsApp button. |

### Category partials (`assets/css/category/`)

| File | Purpose |
|---|---|
| `01-category-shell.css` | Category header, back link, breadcrumbs, hero, feature grid. |
| `02-workspace.css` | Workspace modal, records, recycle bin, backup, plans, related cards. |
| `03-global-rules.css` | Text selection and paragraph justification rules. |
| `04-saas-portal.css` | SaaS dashboard portal, sidebar, top bar, KPI strip. |
| `05-safety-and-buttons.css` | Data-safety modals and action buttons. |
| `06-table-and-kpi.css` | Table row actions, clean top bar, two-KPI grid. |
| `07-analytics-and-profile.css` | Analytics strip, clutter cleanup, account profile modal. |
| `08-enterprise-extensions.css` | Multi-currency, sortable headers, pagination, compliance. |
| `09-legal-phone-whatsapp.css` | Legal modal, international phone input, WhatsApp button. |

### Other stylesheets

| File | Purpose |
|---|---|
| `assets/css/pages/home-signup-modal.css` | Styles extracted from the old inline block in `index.html`; loaded only by the home page. |
| `assets/css/signup.css` | Standalone `signup.html` styles. |

---

## `assets/js/`

### Shared scripts

| File | Purpose |
|---|---|
| `feature-registry.js` | Defines built-in and generic categories, every feature's fields and validation, the Supabase client/config, and shared utilities. Publishes `window.OMS_FEATURE_MODULES`. |
| `security.js` | Console warning, framing guard, input hardening and other browser-side deterrents. Loaded first on every page. |
| `ui.js` | Scroll progress bar, back-to-top, CTA wiring and reveal-on-scroll. Loaded last. |
| `liveads.js` | Public "Running Business Ads" card grid for all visitors, including media and expiry handling. |
| `signup.js` | Logic for the standalone `signup.html` phone flow. |

### Home scripts (`assets/js/home/`)

| File | Purpose |
|---|---|
| `01-core-utilities.js` | Shared phone/country-code helper. |
| `02-supabase-client.js` | Supabase client, cloud user state, legacy auth cleanup. |
| `03-security.js` | Server-side CEO check and login throttling. |
| `04-cloud-sync.js` | Automatic cloud sync, restore, avatar copy and session bootstrap. |
| `05-navigation-and-hero.js` | Mobile nav, scroll spy, category detail cards, toasts, portal toggles. |
| `06-owner-account.js` | Owner account helpers that connect owners to categories. |
| `07-user-accounts.js` | Site user records, trial state and account profiles. |
| `08-user-auth-modal.js` | User sign-up / sign-in modal, validation, country phone picker. |
| `09-ceo-account.js` | CEO one-time setup, sign-in, session and master panel. |
| `10-features-and-data-sheet.js` | Feature entry badges and the per-category "All Data" sheet. |
| `11-super-admin.js` | Super Admin console: accounts, subscriptions, reports, cross-account data. |
| `12-owner-business-admin.js` | Owner business admin console, cashbook and reports. |
| `13-category-admin.js` | Per-category admin console. |
| `14-avatar-and-portfolio.js` | Owner profile photo upload (local + IndexedDB + cloud) and portfolio viewer. |
| `15-reviews.js` | Public ratings, comments, CEO replies and moderation. |
| `16-business-registration.js` | Business ad registration form, plans, media upload and validation. |
| `17-business-ads.js` | CEO business-ads panel: payment marking, activation, extension, expiry. |
| `18-init-and-subscriptions.js` | Startup cleanup, cloud restore and subscription purchase modal. |
| `19-user-profile.js` | Enterprise user profile card and account management. |

### Category scripts (`assets/js/category/`)

| File | Purpose |
|---|---|
| `01-config.js` | Shared phone helper and date-filter state. |
| `02-category-catalog.js` | Category catalog: titles, copy, icons, SEO text and feature lists. |
| `03-page-state.js` | Resolves `CURRENT` category, writes SEO meta, currency and workspace state. |
| `04-access-and-trial.js` | Feature definitions, trial state and access rules. |
| `05-trial-modal.js` | Sign-up / trial / subscription modals for category pages. |
| `06-auth-and-paywall.js` | Sign-in, paywall and auth panel open/close. |
| `07-workspace-data.js` | Workspace records, trash, toasts and cloud load/save. |
| `08-export-and-backup.js` | Backup export/import, CSV, print report and auto-backup. |
| `09-safety-modals.js` | Shortcuts, data safety, privacy and demo-reset modals. |
| `10-saas-shell.js` | SaaS sidebar, top bar, analytics strip and navigation. |
| `11-render-list-and-form.js` | Record list, sorting, pagination and the entry form. |
| `12-open-feature.js` | Opens a feature from its card. |
| `13-feature-actions.js` | Per-feature tools, table actions and workspace event wiring. |
| `14-page-init.js` | Related categories and page bootstrap. |

---

## `assets/img/`

| File | Purpose |
|---|---|
| `clinic.jpg`, `academy.jpg`, `restaurant.jpg`, `generalstore.jpg`, `beautysalon.jpg`, `petrolpump.jpg`, `medicalstore.jpg`, `laboratory.jpg` | Category card images. |
| `devices.png` | Hero device mockup. |

Images are referenced with the `assets/img/...` prefix and a `?v=` query string
in HTML. JavaScript-generated images live in `category/14-page-init.js` and
`home/05-navigation-and-hero.js`; if an image path changes, update both.

---

## `docs/`

| File | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | How pages, CSS cascade, script order, data flow and Supabase fit together. |
| `docs/FILE-MAP.md` | This file. |
| `docs/CONTRIBUTING.md` | Safe-edit rules, naming, checklists and common mistakes. |
| `docs/templates/category-page-template.html` | Complete category page template. Copy to the repository root, then change `data-category`, title, meta and copy. |
| `docs/templates/README.md` | How to add a new category page with the template. |
