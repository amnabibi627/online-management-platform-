# Category page template

`category-page-template.html` is the canonical shell for every category page.
It is **not** served; it exists so a new category can be added without copying
an existing page and inheriting its content by accident.

---

## 1. Placeholders

Replace every `@@...@@` token before saving:

| Token | What to put there | Example |
|---|---|---|
| `@@TITLE@@` | Browser title | `Petrol Pump Management \| Online Management Site` |
| `@@META@@` | Meta description, used in description/OG/Twitter | `Run pumps, shifts, stock and accounts in one place.` |
| `@@CANONICAL@@` | Full canonical URL | `https://onlinemanagement.site/petrolpump` |
| `@@OGTITLE@@` | Open Graph title | `Petrol Pump Management` |
| `@@KEY@@` | Category key, must exist in `CATEGORIES` | `petrolpump` |
| `@@H1@@` | Hero heading | `Petrol Pump Management Software` |
| `@@DESC@@` | Hero paragraph | `Track sales, shifts, tanks and staff.` |
| `@@COUNT@@` | Number of tools | `12` |
| `@@FEATURES@@` | Static fallback feature cards | copy the card block below |

The hero image is hard-coded to `assets/img/clinic.jpg` in the template. Change
it to `assets/img/<your-category>.jpg` and update the `alt` text.

`@@FEATURES@@` is a fallback. `assets/js/category/14-page-init.js` and
`assets/js/category/03-page-state.js` render the real list from `CATEGORIES`,
so the static cards matter only before JavaScript runs and for crawlers. Keep
them consistent with the catalog.

---

## 2. Add a new category page

1. **Copy the template** to the repository root:

   ```powershell
   Copy-Item docs\templates\category-page-template.html .\petrolpump-new.html
   ```

2. **Replace the placeholders** listed above. Keep `<body data-category="...">`
   and the script/style tags exactly as they are, including the `?v=` string.

3. **Add the category to the catalog** in
   `assets/js/category/02-category-catalog.js`:

   ```js
   petrolpump_new: {
     key: "petrolpump_new",
     short: "Petrol Pump",
     h1: "Petrol Pump Management Software",
     desc: "...",
     meta: "...",
     icon: "...",
     features: [ /* same shape as the other categories */ ]
   }
   ```

   Use an existing category entry as the shape reference. The key must match
   `data-category` and the URL.

4. **Add feature definitions** in `assets/js/feature-registry.js` under
   `FEATURE_REGISTRY[<key>]`, or reuse `GENERIC_FEATURES` entries. Every feature
   needs `name`, `icon`, `desc` and `fields`.

5. **Register it as a built-in** only if it is permanent: add the key to
   `BUILTIN_CATEGORIES` in `assets/js/feature-registry.js`. Built-in categories
   cannot be removed by the CEO.

6. **Wire the rest of the site**:
   - home page category card in `index.html` (and its `assets/img/` image);
   - `sitemap.xml` entry;
   - any footer, nav or related-category link;
   - category image in `assets/img/`.

7. **Check the chain**:

   ```text
   data-category -> CATEGORIES[key] -> CURRENT -> feature list -> workspace
   ```

   If any link is missing, the page falls back to `CATEGORIES.clinic` (wrong
   content) or renders an empty feature grid.

8. **Test** as described in `docs/CONTRIBUTING.md` section 4: no console
   errors, feature cards render, records save and reload, paywall appears for an
   account without a subscription, and the home page link works.

---

## 3. Do not

- Do not add a second copy of the category scripts to the page. Every category
  page uses the same `assets/js/category/01..14` files.
- Do not change the numeric script order or remove `feature-registry.js`.
- Do not put feature definitions in the HTML only; the workspace needs the
  registry entry.
- Do not rename `data-category` after records exist; the key names the stored
  data row and the local cache.

---

## 4. Template maintenance

When the shared category shell changes, update the template in the same commit:

- header/footer/nav structure;
- modal roots (`catWorkspace`, trial/auth modals, safety modals);
- script/style tags and `?v=` string;
- meta and Open Graph tags.

Verify the template still differs from a real page only by its placeholders.
`docs/FILE-MAP.md` lists every file it depends on.
