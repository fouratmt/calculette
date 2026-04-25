const test = require("node:test");
const assert = require("node:assert/strict");

const { loadCoreModules } = require("./helpers/browser-harness");

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

test("sanitizeState migrates legacy flat overrides into per-year buckets", function () {
  const { context } = loadCoreModules();
  const { sanitizeState } = context.Calculette.storage;

  const sanitizedState = sanitizeState({
    year: 2026,
    targetDays: 210,
    dayOverrides: {
      "2026-01-06": "half_day",
      "2027-05-01": "holiday",
      "2027-08-14": "mandated_day_off",
      "1999-01-01": "worked_full",
    },
  });

  assert.equal(sanitizedState.year, 2026);
  assert.equal(sanitizedState.years["2026"].targetDays, 210);
  assert.equal(
    sanitizedState.years["2026"].dayOverrides["2026-01-06"],
    "worked_half",
  );
  assert.equal(
    sanitizedState.years["2027"].dayOverrides["2027-05-01"],
    "administrative_holiday",
  );
  assert.equal(
    sanitizedState.years["2027"].dayOverrides["2027-08-14"],
    "company_closed",
  );
  assert.equal(sanitizedState.years["1999"], undefined);
});

test("sanitizeState keeps only supported fixed years", function () {
  const { context } = loadCoreModules();
  const { sanitizeState } = context.Calculette.storage;

  const sanitizedState = sanitizeState({
    year: 2030,
    years: {
      "2026": { targetDays: 216, dayOverrides: {} },
      "2035": { targetDays: 216, dayOverrides: {} },
    },
  });

  assert.equal(sanitizedState.year, 2026);
  assert.deepEqual(Object.keys(sanitizedState.years), ["2026"]);
});

test("sanitizeState cleans invalid overrides and clamps yearly targets", function () {
  const { context } = loadCoreModules();
  const { sanitizeState } = context.Calculette.storage;

  const sanitizedState = sanitizeState({
    year: 2026,
    settings: {
      weekendsAreBlocked: false,
    },
    years: {
      "2026": {
        targetDays: 999,
        dayOverrides: {
          "2026-01-05": "available",
          "2026-01-06": "weekend",
          "2026-01-07": "bogus",
          "2026-01-08": "worked_full",
          "2026-01-09": "closed",
        },
      },
      "2027": {
        targetDays: -10,
        dayOverrides: {
          "2027-01-04": "half_day",
        },
      },
    },
  });

  assert.equal(sanitizedState.settings.weekendsAreBlocked, false);
  assert.equal(sanitizedState.years["2026"].targetDays, 366);
  assert.deepEqual(toPlainObject(sanitizedState.years["2026"].dayOverrides), {
    "2026-01-08": "worked_full",
    "2026-01-09": "company_closed",
  });
  assert.equal(sanitizedState.years["2027"].targetDays, 0);
  assert.deepEqual(toPlainObject(sanitizedState.years["2027"].dayOverrides), {
    "2027-01-04": "worked_half",
  });
});

test("sanitizeState merges legacy overrides without overwriting canonical years", function () {
  const { context } = loadCoreModules();
  const { sanitizeState } = context.Calculette.storage;

  const sanitizedState = sanitizeState({
    year: 2026,
    targetDays: 210,
    dayOverrides: {
      "2026-01-06": "holiday",
      "2026-01-07": "vacation",
      "2027-01-04": "mandated_day_off",
    },
    years: {
      "2026": {
        targetDays: 205,
        dayOverrides: {
          "2026-01-06": "worked_half",
        },
      },
      "2027": {
        targetDays: 215,
        dayOverrides: {
          "2027-01-05": "worked_full",
        },
      },
    },
  });

  assert.equal(sanitizedState.years["2026"].targetDays, 205);
  assert.deepEqual(toPlainObject(sanitizedState.years["2026"].dayOverrides), {
    "2026-01-06": "worked_half",
    "2026-01-07": "not_worked",
  });
  assert.equal(sanitizedState.years["2027"].targetDays, 215);
  assert.deepEqual(toPlainObject(sanitizedState.years["2027"].dayOverrides), {
    "2027-01-04": "company_closed",
    "2027-01-05": "worked_full",
  });
});

test("saveState persists normalized overrides and loadState reads them back", function () {
  const { context, localStorage } = loadCoreModules();
  const { STORAGE_KEY, loadState, saveState } = context.Calculette.storage;

  saveState({
    year: 2026,
    years: {
      "2026": {
        targetDays: 205.5,
        dayOverrides: {
          "2026-01-06": "vacation",
          "2026-01-07": "half_day",
        },
      },
    },
  });

  const persistedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(
    persistedState.years["2026"].dayOverrides["2026-01-06"],
    "not_worked",
  );
  assert.equal(
    persistedState.years["2026"].dayOverrides["2026-01-07"],
    "worked_half",
  );

  const loadedState = loadState();
  assert.equal(loadedState.years["2026"].targetDays, 205.5);
  assert.equal(loadedState.years["2026"].dayOverrides["2026-01-06"], "not_worked");
  assert.equal(loadedState.years["2026"].dayOverrides["2026-01-07"], "worked_half");
});

test("loadState falls back to a default state for invalid stored JSON", function () {
  const { context, localStorage } = loadCoreModules();
  const { DEFAULT_TARGET_DAYS, STORAGE_KEY, loadState } = context.Calculette.storage;

  localStorage.setItem(STORAGE_KEY, "{not valid json");

  const loadedState = loadState();

  assert.equal(loadedState.year, 2026);
  assert.equal(loadedState.years["2026"].targetDays, DEFAULT_TARGET_DAYS);
  assert.deepEqual(toPlainObject(loadedState.years["2026"].dayOverrides), {});
});

test("ensureYearState sanitizes an existing year in place", function () {
  const { context } = loadCoreModules();
  const { ensureYearState } = context.Calculette.storage;
  const state = {
    years: {
      "2026": {
        targetDays: "210.5",
        dayOverrides: {
          "2026-01-06": "vacation",
          "2026-01-07": "available",
        },
      },
    },
  };

  const yearState = ensureYearState(state, 2026);

  assert.equal(yearState, state.years["2026"]);
  assert.deepEqual(toPlainObject(yearState), {
    targetDays: 210.5,
    dayOverrides: {
      "2026-01-06": "not_worked",
    },
  });
});

test("resetYearState clears only the requested year and persists the result", function () {
  const { context, localStorage } = loadCoreModules();
  const {
    DEFAULT_TARGET_DAYS,
    STORAGE_KEY,
    resetYearState,
  } = context.Calculette.storage;

  const resetState = resetYearState(
    {
      year: 2026,
      years: {
        "2026": {
          targetDays: 205,
          dayOverrides: {
            "2026-01-06": "not_worked",
          },
        },
        "2027": {
          targetDays: 215,
          dayOverrides: {
            "2027-01-04": "worked_half",
          },
        },
      },
    },
    2026,
  );
  const persistedState = JSON.parse(localStorage.getItem(STORAGE_KEY));

  assert.equal(resetState.year, 2026);
  assert.deepEqual(toPlainObject(resetState.years["2026"]), {
    targetDays: DEFAULT_TARGET_DAYS,
    dayOverrides: {},
  });
  assert.deepEqual(toPlainObject(resetState.years["2027"]), {
    targetDays: 215,
    dayOverrides: {
      "2027-01-04": "worked_half",
    },
  });
  assert.deepEqual(persistedState.years, toPlainObject(resetState.years));
});
