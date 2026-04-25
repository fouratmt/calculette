# Project Plan

## 1. Overview

### Product Summary

Build a lightweight static browser app to pilot worked days over a selected year.

Current scope:

- selectable years: `2025`, `2026`, `2027`, `2028`
- configurable yearly target, such as `216` days
- French public holidays generated locally
- normal legal weekdays prefilled as `worked_full`
- a calendar used to subtract or adjust days with explicit overrides
- direct execution from `index.html` without a build step
- local backup and restore through JSON export and import
- public-ready static metadata and assets for hosted deployment
- GitHub Pages deployment support for a static custom-domain site

### Primary Outcome

The app should let the user see, at a glance, whether the current yearly plan hits the target and quickly adjust one day or a range of days from the calendar.

## 2. Product Principles

### What Matters Most

- fast daily usage
- very clear yearly view
- simple rules
- reliable calculations
- no backend
- all data stored locally
- direct browser usage from disk
- mobile-friendly behavior
- clear behavior when moving between a local file, preview URL, and production domain

## 3. Current Product Rules

### Baseline Planning Model

The app currently starts from a filled planning baseline rather than an empty one:

- a normal legal weekday defaults to `worked_full`
- French holidays are generated automatically for the selected year
- pure weekend dates remain non-working and are locked in the UI
- when a date is both a holiday and a weekend, the holiday state takes visual precedence and the date stays editable like a holiday
- the calendar is mainly used to turn default worked days into non-worked days, closures, holidays, or half-days

### Editable Day Statuses

The user-facing editor supports the following statuses:

| Status Key | Label | Counted Value | Notes |
| --- | --- | --- | --- |
| `worked_full` | `Travaillé` | `1` | Default for normal legal weekdays and also a valid override |
| `worked_half` | `Travaillé 0,5` | `0.5` | Partial workday |
| `not_worked` | `Congé` | `0` | Non-worked but still recoverable in future-capacity calculations |
| `company_closed` | `Fermeture` | `0` | Blocked day |
| `administrative_holiday` | `Jour férié` | `0` | Blocked day, either generated or manually overridden |
| `weekend` | `Week-end` | `0` | Derived only, not stored as an override |

There is no user-facing `available` state in the current UI.

### What Counts Toward the Yearly Target

- `worked_full = 1`
- `worked_half = 0.5`

### What Does Not Count

- `not_worked = 0`
- `company_closed = 0`
- `administrative_holiday = 0`
- `weekend = 0`

### Reset to Default

`Reset to default` removes the stored override and falls back to the generated default for that date:

1. explicit override removed
2. generated French holiday if one exists
3. weekend rule
4. otherwise `worked_full`

### Effective Status Resolution

Every date currently resolves in this order:

1. explicit user override
2. generated French holiday
3. weekend
4. default `worked_full` day

That resolver drives rendering, calculations, and the day editor state.

## 4. Calculations And Status

### Core Metrics

The calculation layer currently derives:

- `targetDays`
- `workedEquivalentDays`
- `notWorkedDays`
- `remainingTarget`
- `overTarget`
- `recoverableDays`
- `reducibleDays`
- `requiredUtilizationRate`

It also computes supporting values such as `totalLegalWorkdays`, `explicitlyNotWorkedDays`, `companyClosedDays`, `statusTone`, and `statusLabel` for the calendar caption and status rendering.

The summary UI exposes only the headline metrics:

- target
- worked total
- non-worked total
- remaining target or days to remove
- status label
- helper copy based on feasibility math

### Status Thresholds

The current status labels are driven by fixed thresholds:

- `Dépassé` when the worked total already exceeds the target
- `Objectif atteint` when the target is met exactly
- `Impossible` when no adjustable capacity remains or the required rate exceeds `100 %`
- `Limite` above `90 %`
- `À ajuster` above `75 %`
- `Faisable` above `55 %`
- `Confortable` otherwise

When the user is over target, the helper logic switches from “recover remaining work” to “remove worked days from the future plan”.

## 5. User Experience

### Summary Panel

Show:

- yearly target
- worked total
- non-worked total
- remaining target or days to remove
- status badge
- helper sentence explaining the current feasibility

### Calendar View

Show the whole year month by month.

Current calendar behavior:

- Monday-first month grids
- monthly legal-workday and worked-total summaries
- distinct visual states for worked, half-day, non-worked, company-closed, holiday, and weekend
- selected-day highlighting
- today's date gets a small patch-style visual cue
- future default-worked days visually marked as planned
- pure weekend tiles visible but not editable, while weekend holidays render as holidays and stay editable

### Day Interaction

The current interaction model is:

- click an editable day to select it
- shift-click to select an editable range, with pure weekends excluded
- on mobile, tap an editable day to select it and slide over other editable days to extend the range
- use the action panel to apply a status immediately
- on mobile, show the same actions in an inline popover near the selected day or selected range instead of relying on the top action panel
- use keyboard shortcuts for quick entry
- click or tap the same day again to clear the current selection
- on mobile, tapping any day inside the current selected range again clears the current selection
- click or tap anywhere away from day tiles and action controls to clear the current selection

On mobile, once the user has scrolled down the yearly view, a floating button can jump back to the top quickly.

Current actions:

- `Travaillé 1`
- `Travaillé 0,5`
- `Congé`
- `Fermeture`
- `Jour férié`
- `Réinitialiser`

Current shortcuts:

- `T` for worked
- `D` for half-day
- `C` for congé
- `F` for company closed
- `J` for holiday
- `R` for reset
- `Escape` to clear the current selection

### Session Tools

The app also includes a local session panel with:

- last-save timestamp
- number of overridden days
- estimated stored state size
- JSON export
- JSON import
- reset of the current year
- full local-session clear

## 6. Storage Model

### Persisted State

The stored state contains:

- selected year
- settings
- session metadata
- per-year planning buckets under `years`

Only explicit overrides are persisted for individual days inside each yearly bucket.

When the app is hosted online, browser storage remains scoped to the exact site origin. Export and import are therefore the migration path between a local copy, a preview URL, and the final production domain.

### Example Structure

```json
{
  "year": 2026,
  "meta": {
    "sessionId": "session-abc123",
    "schemaVersion": 2,
    "createdAt": "2026-03-28T09:00:00.000Z",
    "updatedAt": "2026-03-28T09:15:00.000Z"
  },
  "settings": {
    "countryHolidayPreset": "FR",
    "weekendsAreBlocked": true,
    "estimationMode": "workable_days_only"
  },
  "years": {
    "2026": {
      "targetDays": 216,
      "dayOverrides": {
        "2026-01-06": "worked_half",
        "2026-01-07": "not_worked",
        "2026-05-01": "worked_full",
        "2026-08-14": "company_closed"
      }
    },
    "2027": {
      "targetDays": 216,
      "dayOverrides": {}
    }
  }
}
```

Legacy override values are migrated on load to the canonical status keys, older flat yearly state is grouped into `years[year]`, and legacy `mandated_day_off` values are folded into `company_closed`.

## 7. Open Items

The main follow-up items still to decide or implement are:

1. Revisit the status heuristic if labels should depend on recent actual pace instead of fixed thresholds only.
2. Decide whether year support should remain fixed to `2025`-`2028` or become dynamic.
3. Improve bulk-editing speed beyond the current selection panel and single-key shortcuts.
