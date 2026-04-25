# Implementation Tracker

This file tracks the current implementation status against the product plan in `PLAN.md`.

## Snapshot

- The static app shell, yearly summary, full-year calendar, and local session panel are implemented.
- Normal legal weekdays default to `worked_full`, pure weekends are locked, and generated French holidays take visual precedence when they overlap weekends, which keeps those dates editable as holidays.
- Per-year data is isolated in storage, so changing or resetting one year no longer mutates another year's overrides.
- Single-day editing, desktop shift-click range selection, mobile touch-range selection, and keyboard shortcuts are implemented.
- Initial summary rendering no longer waits for the full 12-month calendar DOM; the calendar and manifest registration are deferred until after first paint.
- Calendar day clicks use one delegated handler, and selection-only changes update the editor and tile selection state without rebuilding the whole year.
- JSON export/import, current-year reset, and full local-session clearing are implemented.
- Public-launch assets are present: production metadata, polished PWA icons, maskable install icons, manifest screenshots, a service worker, PNG/SVG social card, `robots.txt`, `sitemap.xml`, `404.html`, and a privacy page.
- GitHub Pages deployment support is present through static-compatible files, `.nojekyll`, and the root `CNAME` for `monquota.fr`; no additional Actions work is needed in this app.
- The launch checklist now tracks each go-live recommendation as implemented, already configured, or host-dependent.
- The remaining go-live checks are production smoke testing and social preview rendering.
- Lightweight Node regression tests cover storage normalization and core calculation rules.

## Plan Coverage

| Plan area | Status | Notes |
| --- | --- | --- |
| Static browser app with no backend | Implemented | The app runs from plain HTML, CSS, and JavaScript. |
| Direct use from `index.html` | Implemented | The page uses deferred script tags and works without a build step. |
| Fixed year scope (`2025`-`2028`) | Implemented | The selector and state sanitization both enforce this range. |
| Configurable yearly target | Implemented | Year and target are editable from the settings form. |
| French public holidays generated locally | Implemented | Holiday dates are derived in `src/data/holidays-fr.js`. |
| Baseline legal weekdays prefilled as worked | Implemented | `getDefaultDayRecord()` returns `worked_full` for non-holiday, non-weekend weekdays. |
| Semantic day-status model | Implemented | The editable statuses are `worked_full`, `worked_half`, `not_worked`, `company_closed`, and `administrative_holiday`, with `not_worked` displayed as `Congé`. |
| Weekend and holiday derived defaults | Implemented | Weekends are derived, and generated holidays override both the default worked baseline and weekend rendering, so weekend holidays stay editable as holidays. |
| Persist only explicit overrides | Implemented | `years[year].dayOverrides` stores only non-default day edits inside each yearly bucket. |
| Legacy status migration on load | Implemented | Older values are normalized to canonical status keys, legacy flat state is migrated into per-year storage, and `mandated_day_off` is folded into `company_closed`. |
| Year-isolated local state | Implemented | Targets and overrides are stored under `years[year]`, and resetting a year only resets that bucket. |
| Summary headline metrics | Implemented | The UI shows target, worked total, non-worked total, remaining target, and status. |
| Feasibility helper copy | Implemented | Helper text uses recoverable and reducible capacity calculations. |
| Fixed status-threshold heuristic | Implemented | Status labels map from fixed utilization thresholds. |
| Full-year calendar rendering | Implemented | All 12 months render with Monday-first grids, monthly summaries, and a small patch-style marker for today's date. |
| Initial-load performance | Implemented | The summary renders first; the below-the-fold calendar and manifest registration are scheduled after first paint. |
| Visual distinction between statuses | Implemented | Worked, half-day, non-worked, company-closed, holiday, and weekend have separate styles. |
| Single-day editing | Implemented | Clicking an editable day opens immediate status actions for that selection. |
| Range editing | Implemented | Shift-click selects an editable date range, skipping pure weekend tiles while still allowing holiday-weekend dates because they resolve to holidays. |
| Mobile drag range editing | Implemented | On narrow screens, tapping a day and dragging over others extends the current editable range. |
| Selection reset by repeat tap or away click | Implemented | Repeating a tap on the same editable day or on an already selected mobile range clears the selection, and clicks or taps away from day tiles and action controls also clear it. |
| Selection render performance | Implemented | Selecting, extending, or clearing a selection updates the editor, popover, and tile pressed state without reconstructing the calendar DOM. |
| Keyboard shortcuts | Implemented | `T`, `D`, `C`, `F`, `J`, `R`, and `Escape` are wired globally. |
| Reset to default | Implemented | Reset removes the override and falls back to the derived default for the date. |
| Mobile inline action popover | Implemented | On narrow screens, selected days can be edited from a popover whose pointer follows the selected day or selected range in the calendar. |
| Mobile scroll-to-top button | Implemented | After scrolling down on narrow screens, a floating button can jump back to the top quickly. |
| Local JSON backup and restore | Implemented | The session panel exports and imports JSON state files. |
| Current-year reset | Implemented | The session panel can rebuild the selected year from defaults. |
| Full local-session clear | Implemented | Stored local state can be removed and recreated from scratch. |
| Mobile-friendly layout | Implemented | The CSS adapts the layout for narrower screens. |
| Accessibility labels for day tiles | Implemented | Calendar buttons now expose full date, status, selection, today, and editability to assistive tech. |
| Lightweight calculation and storage tests | Implemented | `just check` now runs syntax validation plus Node unit tests. |
| Public launch metadata and static assets | Implemented | The app shell now includes deferred manifest registration, favicon, square install icons, manifest screenshots, production social metadata, social card assets, robots configuration, and a sitemap. |
| PWA install support | Implemented | The manifest includes app identity, display metadata, mobile theme/background colors, regular and maskable icons, screenshots, and a shortcut; `service-worker.js` caches the static app shell on secure origins. |
| Privacy page | Implemented | A dedicated static page explains local storage, the absence of a backend, and the absence of analytics/session replay. |
| GitHub Pages deployment flow | Already configured outside this pass | The app is kept as plain static files for the existing repository Pages flow; no extra Actions workflow is required. |
| GitHub Pages static serving compatibility | Implemented | `.nojekyll` prevents Jekyll processing and keeps the static file tree served directly. |
| Custom 404 page | Implemented | `404.html` provides a static GitHub Pages 404 response page. |
| Production-domain metadata | Implemented | Canonical, Open Graph, and Twitter metadata point to `https://monquota.fr/` and the production PNG social card. |
| Search indexing support | Implemented | Crawling is allowed through `robots.txt`, and `sitemap.xml` lists absolute production URLs. |
| GitHub Pages custom domain | Done | The root `CNAME` file contains `monquota.fr`; DNS is configured and the custom domain is verified in GitHub Pages settings. |
| GitHub Pages HTTPS | Done | Enforce HTTPS is enabled after DNS and custom-domain verification. |
| Production smoke test | Not yet verified | Confirm homepage `200`, unknown routes show `404.html`, and `http://` redirects to `https://` on production. |
| Social preview rendering | Not yet verified | Check that link previews render `https://monquota.fr/social-card.png` correctly after deployment. |
| Security headers and cache policy | GitHub Pages managed | Plain GitHub Pages does not support repo-defined custom headers or cache rules; use a proxy/CDN only if those become hard requirements. |
