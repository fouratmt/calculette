const test = require("node:test");
const assert = require("node:assert/strict");

const { loadCoreModules } = require("./helpers/browser-harness");

function createPlanningState(dayOverrides) {
  return {
    year: 2028,
    targetDays: 216,
    settings: {
      countryHolidayPreset: "FR",
      weekendsAreBlocked: true,
      estimationMode: "workable_days_only",
    },
    dayOverrides: dayOverrides || {},
  };
}

test("holiday precedence wins over weekend in default records", function () {
  const { context } = loadCoreModules();
  const { createDateAtNoon } = context.Calculette.dateUtils;
  const { getFrenchHolidays } = context.Calculette.holidays;
  const { getDefaultDayRecord } = context.Calculette.calculations;

  const date = createDateAtNoon(2027, 7, 15);
  const holidaysByIso = getFrenchHolidays(2027);
  const defaultRecord = getDefaultDayRecord(date, createPlanningState(), holidaysByIso);

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
      "2028-05-01": "worked_full",
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
      "2028-01-03": "worked_half",
      "2028-01-04": "not_worked",
      "2028-01-05": "company_closed",
      "2028-01-10": "administrative_holiday",
      "2028-05-01": "worked_full",
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
