# calculette_jours_homme

Small static scaffold for a freelance workday planning app.

## Current Setup

- No framework
- No backend
- Local state stored in `localStorage`
- French public holidays generated in code

## Structure

```text
.
├── .editorconfig
├── docs/
│   ├── IMPLEMENTATION_TRACKER.md
│   └── PLAN.md
├── justfile
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
├── index.html
└── README.md
```

## Notes

- `docs/PLAN.md` is the source product plan.
- `docs/IMPLEMENTATION_TRACKER.md` records what is currently implemented against that plan.
- The browser entry point is loaded with plain deferred scripts so `index.html` works when opened directly from disk.
- Normal legal workdays are prefilled as worked days, and the calendar is used mainly to subtract or adjust days.
- Semantic day statuses are preserved in storage as `worked_full`, `worked_half`, `not_worked`, `company_closed`, and `administrative_holiday`.
- Local storage isolates targets and overrides per selected year across `2025` to `2028`.
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
```

- `just check` runs a fast JavaScript syntax pass with Node across `src/`.
- `just doctor` shows the local versions of `just`, `uvx`, `python3`, and `node`.
