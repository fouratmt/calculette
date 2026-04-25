const test = require("node:test");
const assert = require("node:assert/strict");

const { loadCoreModules } = require("./helpers/browser-harness");

function createPlanningState(options) {
  const settings = options || {};

  return {
    year: settings.year || 2028,
    targetDays:
      typeof settings.targetDays === "number" ? settings.targetDays : 216,
    settings: {
      countryHolidayPreset: "FR",
      weekendsAreBlocked: settings.weekendsAreBlocked !== false,
      estimationMode: "workable_days_only",
    },
    dayOverrides: settings.dayOverrides || {},
  };
}

function createOverrideMap(isoDates, status) {
  return Object.fromEntries(
    isoDates.map(function mapIsoDate(isoDate) {
      return [isoDate, status];
    }),
  );
}

function getFirstLegalWorkdayIsos(context, year, count) {
  const { getMonthDays, isWeekend, toIsoDate } = context.Calculette.dateUtils;
  const { getFrenchHolidays } = context.Calculette.holidays;
  const holidaysByIso = getFrenchHolidays(year);
  const isoDates = [];

  for (let monthIndex = 0; monthIndex < 12 && isoDates.length < count; monthIndex += 1) {
    for (const date of getMonthDays(year, monthIndex)) {
      const isoDate = toIsoDate(date);
      if (!isWeekend(date) && !holidaysByIso.has(isoDate)) {
        isoDates.push(isoDate);
      }

      if (isoDates.length === count) {
        break;
      }
    }
  }

  assert.equal(isoDates.length, count);
  return isoDates;
}

test("holiday precedence wins over weekend in default records", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { getFrenchHolidays } = context.Calculette.holidays;
  const { getDefaultDayRecord } = context.Calculette.calculations;

  const date = createDateAtNoon(2027, 7, 15);
  const holidaysByIso = getFrenchHolidays(2027);
  const defaultRecord = getDefaultDayRecord(
    date,
    createPlanningState(),
    holidaysByIso,
  );

  assert.equal(defaultRecord.status, "administrative_holiday");
  assert.equal(defaultRecord.source, "holiday");
  assert.equal(defaultRecord.holidayName, "Assomption");
});

test("explicit overrides still win over generated holidays", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { getFrenchHolidays } = context.Calculette.holidays;
  const { getEffectiveDayRecord } = context.Calculette.calculations;

  const date = createDateAtNoon(2028, 4, 1);
  const holidaysByIso = getFrenchHolidays(2028);
  const record = getEffectiveDayRecord(
    date,
    createPlanningState({
      dayOverrides: {
        "2028-05-01": "worked_full",
      },
    }),
    holidaysByIso,
  );

  assert.equal(record.status, "worked_full");
  assert.equal(record.source, "override");
  assert.equal(record.holidayName, "Fête du travail");
});

test("year snapshot metrics react predictably to overrides", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { buildYearSnapshot } = context.Calculette.calculations;

  const baselineSnapshot = buildYearSnapshot(
    createPlanningState(),
    createDateAtNoon(2027, 11, 31),
  );
  const adjustedSnapshot = buildYearSnapshot(
    createPlanningState({
      dayOverrides: {
        "2028-01-03": "worked_half",
        "2028-01-04": "not_worked",
        "2028-01-05": "company_closed",
        "2028-01-10": "administrative_holiday",
        "2028-05-01": "worked_full",
      },
    }),
    createDateAtNoon(2027, 11, 31),
  );

  assert.equal(
    adjustedSnapshot.workedEquivalentDays,
    baselineSnapshot.workedEquivalentDays - 2.5,
  );
  assert.equal(adjustedSnapshot.notWorkedDays, baselineSnapshot.notWorkedDays + 2.5);
  assert.equal(
    adjustedSnapshot.companyClosedDays,
    baselineSnapshot.companyClosedDays + 1,
  );
  assert.equal(
    adjustedSnapshot.explicitlyNotWorkedDays,
    baselineSnapshot.explicitlyNotWorkedDays + 1,
  );
});

test("weekend blocking can be disabled without changing holidays", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { getFrenchHolidays } = context.Calculette.holidays;
  const { getDefaultDayRecord } = context.Calculette.calculations;
  const holidaysByIso = getFrenchHolidays(2028);

  const saturdayRecord = getDefaultDayRecord(
    createDateAtNoon(2028, 0, 8),
    createPlanningState({ weekendsAreBlocked: false }),
    holidaysByIso,
  );
  const holidayRecord = getDefaultDayRecord(
    createDateAtNoon(2028, 0, 1),
    createPlanningState({ weekendsAreBlocked: false }),
    holidaysByIso,
  );

  assert.equal(saturdayRecord.status, "worked_full");
  assert.equal(saturdayRecord.source, "default");
  assert.equal(holidayRecord.status, "administrative_holiday");
  assert.equal(holidayRecord.source, "holiday");
});

test("remaining recovery capacity only includes dates on or after reference date", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { buildYearSnapshot } = context.Calculette.calculations;
  const referenceDate = createDateAtNoon(2028, 5, 1);
  const baselineSnapshot = buildYearSnapshot(createPlanningState(), referenceDate);
  const dayOverrides = {
    "2028-01-03": "not_worked",
    "2028-12-29": "not_worked",
  };
  const workedAfterOverrides = baselineSnapshot.workedEquivalentDays - 2;

  const snapshot = buildYearSnapshot(
    createPlanningState({
      targetDays: workedAfterOverrides + 2,
      dayOverrides,
    }),
    referenceDate,
  );

  assert.equal(snapshot.workedEquivalentDays, workedAfterOverrides);
  assert.equal(snapshot.remainingTarget, 2);
  assert.equal(snapshot.recoverableDays, 1);
  assert.equal(snapshot.remainingWorkableDays, 1);
  assert.equal(snapshot.requiredUtilizationRate, 2);
  assert.equal(snapshot.statusTone, "impossible");
  assert.equal(snapshot.statusLabel, "Impossible");
});

test("fixed status thresholds preserve boundary behavior", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { buildYearSnapshot } = context.Calculette.calculations;
  const referenceDate = createDateAtNoon(2027, 11, 31);
  const unavailableIsos = getFirstLegalWorkdayIsos(context, 2028, 20);
  const dayOverrides = createOverrideMap(unavailableIsos, "not_worked");
  const baselineSnapshot = buildYearSnapshot(createPlanningState(), referenceDate);
  const workedAfterOverrides = baselineSnapshot.workedEquivalentDays - 20;
  const scenarios = [
    {
      targetDays: workedAfterOverrides - 1,
      tone: "over_target",
      label: "Dépassé",
      mode: "reduce",
    },
    {
      targetDays: workedAfterOverrides,
      tone: "target_reached",
      label: "Objectif atteint",
      mode: "none",
    },
    {
      targetDays: workedAfterOverrides + 21,
      tone: "impossible",
      label: "Impossible",
      mode: "recover",
    },
    {
      targetDays: workedAfterOverrides + 20,
      tone: "behind",
      label: "Limite",
      mode: "recover",
    },
    {
      targetDays: workedAfterOverrides + 18,
      tone: "at_risk",
      label: "À ajuster",
      mode: "recover",
    },
    {
      targetDays: workedAfterOverrides + 15,
      tone: "on_track",
      label: "Faisable",
      mode: "recover",
    },
    {
      targetDays: workedAfterOverrides + 11,
      tone: "ahead",
      label: "Confortable",
      mode: "recover",
    },
  ];

  for (const scenario of scenarios) {
    const snapshot = buildYearSnapshot(
      createPlanningState({
        targetDays: scenario.targetDays,
        dayOverrides,
      }),
      referenceDate,
    );

    assert.equal(snapshot.statusTone, scenario.tone);
    assert.equal(snapshot.statusLabel, scenario.label);
    assert.equal(snapshot.adjustmentMode, scenario.mode);
  }
});
