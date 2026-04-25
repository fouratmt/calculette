const test = require("node:test");
const assert = require("node:assert/strict");

const { loadCoreModules } = require("./helpers/browser-harness");

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
