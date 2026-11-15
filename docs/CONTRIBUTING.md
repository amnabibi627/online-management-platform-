# Contributing

This repository is a **static site with no build step**. A clean edit means the
browser can load the file directly and nothing else needs to be compiled,
bundled or generated.

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first. This page is the practical
checklist.

---

## 1. Golden rules

1. **Do not reorder or remove script tags.** Classic scripts share one global
   scope; order is the dependency graph.
2. **No duplicate top-level names.** A second `const openModal` in another
   partial is a `SyntaxError` that stops the page. Prefix helpers
   (`category...`, `review...`, `owner...`) or put them on an object.
3. **Edit partials, not CSS entry files.** Keep `@import` lists and numeric
   order intact.
4. **Keep URLs stable.** HTML pages stay at the repository root.
5. **Never put secrets in the repo.** The Supabase publishable key in
   `feature-registry.js` is public by design. Service-role keys are not.
6. **Server-side access must stay server-side.** Hiding a button is not
   security; RLS and RPC checks in `supabase/setup.sql` are.
7. **Keep the source readable.** No minified files, no generated bundles.
8. **Match the surrounding style.** 2-space indent in CSS/JS, double quotes in
   JS strings, semicolons, `const` by default.

---

## 2. Common tasks

### Change text or markup on the home page

Edit `index.html`. If the text comes from JavaScript, edit the matching
`assets/js/home/*.js` file listed in [`FILE-MAP.md`](FILE-MAP.md).

### Change home page behaviour

1. Find the feature in `assets/js/home/` using `FILE-MAP.md`.
2. Keep the numeric prefix; do not create a second file for the same feature.
3. If you need a new helper, give it a unique, descriptive name.
4. Reload `index.html` and watch the console for errors.

### Change category page behaviour

Category behaviour is shared across all eight pages. Edit
`assets/js/category/*.js`, not the HTML. Only the page shell, meta fallback text
and `data-category` differ per page.

### Add or change a feature field

1. Edit `assets/js/feature-registry.js`.
2. Add the field with `F("key", "Label", "type", required, options)`.
3. Update any presentation code that reads the field
   (`category/11-render-list-and-form.js`, `category/13-feature-actions.js`).
4. Existing records without the new key render as empty; no migration is needed
   for optional fields. Required fields only affect new entries.
5. Check the form, the list view, CSV export and the "All Data" sheet.

### Add a new category

Use the template, not a hand-copied page:

1. Copy `docs/templates/category-page-template.html` to the repository root as
   `<name>.html`.
2. Set `<body data-category="<name>">` and replace Clinic-specific titles, meta,
   canonical URL and fallback copy.
3. Add the category to `CATEGORIES` in
   `assets/js/category/02-category-catalog.js`, preserving the same shape
   (`key`, `short`, `h1`, `desc`, `meta`, `icon`, `features`).
4. Add its feature definitions to `FEATURE_REGISTRY` in
   `assets/js/feature-registry.js`, or reuse `GENERIC_FEATURES`.
5. Add the category to `BUILTIN_CATEGORIES` if it is a permanent built-in.
6. Add the page to `sitemap.xml`, the home page card list and any footer link.
7. Add the image under `assets/img/` and reference it as
   `assets/img/<name>.jpg?v=...`.
8. Check desktop and mobile layouts, sign-up, paywall and saved records.

Detailed steps: [`templates/README.md`](templates/README.md).

### Add a CSS section

1. Create `assets/css/home/NN-name.css` or `assets/css/category/NN-name.css`
   with the next free number.
2. Copy the file header comment style used by the other partials.
3. Add one `@import` line at the **end** of the relevant entry file.
4. If the styles must override existing rules, a late number is intentional;
   document that in the header.

Do not insert a new number in the middle: that renumbers later files and
changes the cascade.

### Add a JavaScript partial

1. Create `assets/js/home/NN-name.js` or `assets/js/category/NN-name.js` with
   the next free number.
2. Add the header comment: page, purpose, "loaded in numeric order".
3. Add the `<script>` tag in the correct HTML file, in numeric order.
4. Guard against missing DOM nodes (`if (!el) return;`).
5. Check the console on a hard refresh. One `SyntaxError` can stop every later
   script.

Prefer extending an existing partial over adding a new one. The split is by
feature area, not by function.

### Change a colour, radius or font size

Design tokens live at the top of `assets/css/home/01-foundation.css` in `:root`.
Change the token there and verify both the home page and a category page; they
share this file.

### Change Supabase schema, RLS or an RPC

Edit `supabase/setup.sql` and re-run the **entire** file in the Supabase SQL
editor. It is written to be repeatable. Then:

1. Update the matching client call.
2. Test as a normal user, as an owner with one category, and as the CEO.
3. Confirm a non-admin cannot call the RPC successfully.

### Bump assets after a production change

Follow `SETUP.md` section 3. Bump the shared `?v=` string in every HTML file
that references a changed asset, then push.

---

## 3. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| CSS partial | `NN-kebab-case.css` | `08-subscription-and-account.css` |
| JS partial | `NN-kebab-case.js` | `15-reviews.js` |
| Shared helper | area prefix + camelCase | `categoryEscape`, `reviewStars` |
| Data attribute hooks | `data-*`, kebab-case | `data-tool-feature`, `data-ws-undo` |
| DOM ids | camelCase | `liveAdsGrid`, `catFeatures` |
| localStorage key | `oms_`, `bms_` or an existing legacy name | `oms_global_currency` |
| Supabase table | snake_case, `public.` schema | `business_ad_requests` |

Do **not** rename an existing `id`, `data-*` attribute or storage key unless you
update every reference in HTML, CSS and JS. Old storage keys are kept on purpose
for compatibility.

---

## 4. Before you commit: checklist

Run through this list for every change.

### Always

- [ ] Open the affected page from the repository root, hard refresh
      (`Ctrl + Shift + R`).
- [ ] Console is free of errors and warnings caused by the change.
- [ ] Header, footer and mobile navigation still work.
- [ ] No script tag was reordered or removed.
- [ ] No duplicate top-level `const` / `let` / `function` name was introduced.
- [ ] Asset URLs use `assets/css/...`, `assets/js/...`, `assets/img/...`.
- [ ] `?v=` string is updated for changed assets before deploying.

### Home page

- [ ] Hero, category cards and category detail panel render.
- [ ] Owner Account and User Sign Up modals open and close.
- [ ] Reviews list loads; signed-in posting still validates.
- [ ] Business registration modal opens and plan selection works.
- [ ] Business ads section renders for a visitor.
- [ ] CEO / Super Admin panels are hidden for non-CEO users.

### Category page

- [ ] Correct category loads (`document.body.dataset.category`).
- [ ] Feature cards open the workspace.
- [ ] Add, edit and delete a record; reload and confirm it persisted.
- [ ] CSV export and print report open.
- [ ] Paywall appears for an account without that category subscription.
- [ ] Recycle bin / restore still works.

### Data and security

- [ ] Tested as a normal user, an owner and the CEO.
- [ ] Non-admin cannot reach CEO-only RPCs.
- [ ] No new secret or service key is in the client code.
- [ ] A blocked account cannot read or write records.

---

## 5. Testing without Node or Python

There is no test runner. Use a local static server and the browser.

PowerShell one-liner (serves the current directory on port 8787):

```powershell
$root = (Get-Location).Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8787/")
$listener.Start()
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = $ctx.Request.Url.LocalPath.TrimStart("/")
  if (-not $path) { $path = "index.html" }
  $file = Join-Path $root $path
  if (Test-Path $file -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.ContentType = switch ([System.IO.Path]::GetExtension($file)) {
      ".html" { "text/html; charset=utf-8" }
      ".css"  { "text/css; charset=utf-8" }
      ".js"   { "text/javascript; charset=utf-8" }
      ".svg"  { "image/svg+xml" }
      ".jpg"  { "image/jpeg" }
      ".png"  { "image/png" }
      default { "application/octet-stream" }
    }
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
```

Then open `http://localhost:8787/index.html` and
`http://localhost:8787/clinic.html`.

Useful checks:

```powershell
# Find leftover old asset paths
Get-ChildItem -Recurse -File -Include *.html,*.css,*.js |
  Select-String -Pattern '(src|href)="(images/|styles\.css|category\.css|script\.js|category\.js)"'

# Find duplicate top-level declarations in a page's scripts (manual review)
Get-ChildItem assets\js\home\*.js |
  Select-String -Pattern '^(const|let|var|function)\s+([A-Za-z_$][\w$]*)' |
  ForEach-Object { $_.Matches[0].Groups[2].Value } |
  Group-Object | Where-Object Count -gt 1

# Whitespace / conflict markers
git diff --check
```

`git diff --check` must be clean before committing.

---

## 6. Things that look like bugs but are intentional

- **Duplicate-looking storage keys** (`bms_user_trial` and
  `oms_trial_account`): both are written for backward compatibility.
- **`styles.css` loaded by category pages**: it contains shared header, footer
  and modal styles.
- **`11-late-overrides.css` and `09-legal-phone-whatsapp.css` overriding earlier
  rules**: the cascade is deliberate. Moving them changes appearance.
- **No password hashes stored locally**: authentication is delegated to
  Supabase Auth.
- **`security.js` cannot truly prevent copying**: it is a deterrent, not a
  security boundary. Do not rely on it for access control.

---

## 7. Keeping markup and field maps in sync

The owner form is a good example of why IDs matter. `assets/js/home/06-owner-account.js`
builds a `fields` map from IDs such as `ofAge` / `errAge`, and
`assets/js/home/08-user-auth-modal.js` validates those nodes. The age input was
missing from `index.html` for a while, which made `openOwnerModal()` throw
before the modal could open.

Rules:

- If you remove an input from HTML, remove its `fields` entry or make the code
  null-safe.
- If you add a `fields` entry, add the matching `id` and error `<span>` in the
  same commit.
- Keep `setError()` defensive (`if (!f.err) ...`) so a future mismatch degrades
  to a missing message instead of a page-breaking exception.
- Test the owner sign-up modal after any change to `index.html`, including
  opening it, submitting invalid values and submitting valid values.
