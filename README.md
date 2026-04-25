# calculette_jours_homme

Small static browser app for planning worked days over a selected year.

## Current Setup

- No framework
- No backend
- Local state stored in `localStorage`
- French public holidays generated in code
- Public launch assets included: favicon, web manifest, social card, sitemap, `robots.txt`, `CNAME`, and privacy page

## Structure

```text
.
├── .editorconfig
├── .nojekyll
├── 404.html
├── CNAME
├── docs/
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── IMPLEMENTATION_TRACKER.md
│   └── PLAN.md
├── confidentialite.html
├── favicon.png
├── justfile
├── robots.txt
├── site.webmanifest
├── sitemap.xml
├── social-card.png
├── social-card.svg
├── src/
│   ├── app.js
│   ├── core/
│   │   └── calculations.js
│   ├── data/
│   │   ├── holidays-fr.js
│   │   └── storage.js
│   ├── lib/
│   │   └── date-utils.js
│   ├── styles/
│   │   └── main.css
│   └── ui/
│       └── calendar.js
├── tests/
│   ├── calculations.test.js
│   ├── storage.test.js
│   └── helpers/
│       └── browser-harness.js
├── index.html
└── README.md
```

## Notes

- `docs/PLAN.md` is the source product plan.
- `docs/IMPLEMENTATION_TRACKER.md` records what is currently implemented against that plan.
- The browser entry point is loaded with plain deferred scripts so `index.html` works when opened directly from disk.
- Normal legal workdays are prefilled as worked days, and the calendar is used mainly to subtract or adjust days.
- Explicit overrides are stored per year under `years[year].dayOverrides` with the canonical status keys `worked_full`, `worked_half`, `not_worked`, `company_closed`, and `administrative_holiday`.
- Generated holidays take precedence over weekend rendering, so a holiday that falls on a weekend is shown and edited as a holiday.
- Local storage isolates targets and overrides per selected year across `2025` to `2028`.
- When the app is hosted online, local storage remains scoped to the exact site address, so JSON export/import is the migration path between origins.
- The first load renders the summary immediately, then defers the full-year calendar and manifest registration until after the first paint to keep the hero responsive.
- Calendar clicks are delegated from the root, and selection-only changes update the highlighted tiles and editor without rebuilding the 12-month DOM.
- `src/core` holds business rules and summary calculations.
- `src/data` holds persistence and holiday data sources.
- `src/lib` holds generic date helpers.
- `src/ui` holds rendering logic.
- `src/styles/main.css` holds the visual system.

## Run

The app still works when opening `index.html` directly, but the simplest local workflow is now:

```sh
just run
```

That serves the app on `http://127.0.0.1:4173`.

If you specifically want the `uvx` variant, it is also available:

```sh
just run-uvx
```

## Dev Helpers

Keep tooling light for this kind of static app:

```sh
just check
just doctor
just test
```

- `just check` runs a JavaScript syntax pass and the lightweight Node unit tests.
- `just test` runs the calculation and storage regression tests only.
- `just doctor` shows the local versions of `just`, `uvx`, `python3`, and `node`.

## Launch Notes

- Launch guidance lives in `docs/DEPLOYMENT_CHECKLIST.md`.
- The app is ready for the existing GitHub Pages flow; no additional GitHub Actions workflow is required.
- The root `CNAME` file contains `monquota.fr`; DNS and GitHub Pages custom-domain verification are done.
- Enforce HTTPS is enabled.
- Canonical/Open Graph/Twitter URLs point to `https://monquota.fr/`.
- `sitemap.xml` and `robots.txt` use absolute production URLs.
- Social preview metadata points to the production PNG social card.
- Still pending after deployment: production smoke test and social preview rendering check.
- GitHub Pages manages response headers and cache policy for plain static hosting; use a proxy/CDN only if custom headers or cache rules become mandatory.
