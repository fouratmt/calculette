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
├── docs/
│   ├── IMPLEMENTATION_TRACKER.md
│   └── PLAN.md
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
- `src/core` holds business rules and summary calculations.
- `src/data` holds persistence and holiday data sources.
- `src/lib` holds generic date helpers.
- `src/ui` holds rendering logic.
- `src/styles/main.css` holds the visual system.

## Run

Open `index.html` directly in a browser, or serve the directory with a static file server such as:

```sh
python3 -m http.server 4173
```
