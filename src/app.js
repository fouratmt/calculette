import { buildYearSnapshot } from "./core/calculations.js";
import { createDefaultState, loadState, saveState } from "./data/storage.js";
import { clamp } from "./lib/date-utils.js";
import { renderCalendar } from "./ui/calendar.js";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const state = loadState();

const elements = {
  settingsForm: document.querySelector("#settings-form"),
  yearInput: document.querySelector("#year-input"),
  targetDaysInput: document.querySelector("#target-days-input"),
  targetDaysValue: document.querySelector("#target-days-value"),
  workedTotalValue: document.querySelector("#worked-total-value"),
  remainingTargetValue: document.querySelector("#remaining-target-value"),
  remainingWorkableValue: document.querySelector("#remaining-workable-value"),
  requiredPaceValue: document.querySelector("#required-pace-value"),
  statusValue: document.querySelector("#status-value"),
  paceCopy: document.querySelector("#pace-copy"),
  calendarCaption: document.querySelector("#calendar-caption"),
  calendarRoot: document.querySelector("#calendar-root"),
  statusCard: document.querySelector(".status-card"),
};

function formatNumber(value) {
  return numberFormatter.format(value);
}

function buildPaceCopy(snapshot) {
  if (snapshot.remainingTarget <= 0) {
    return "The yearly target is already covered with the currently recorded days.";
  }

  if (snapshot.remainingWorkableDays <= 0) {
    return "No workable days remain in the selected year under the current rules.";
  }

  const weeklyEquivalent = snapshot.requiredUtilizationRate * 5;
  return `You need roughly ${formatNumber(
    weeklyEquivalent,
  )} worked days per 5-day week to hit the target.`;
}

function syncInputs() {
  elements.yearInput.value = String(state.year);
  elements.targetDaysInput.value = String(state.targetDays);
}

function renderSummary(snapshot) {
  elements.targetDaysValue.textContent = formatNumber(state.targetDays);
  elements.workedTotalValue.textContent = formatNumber(
    snapshot.workedEquivalentDays,
  );
  elements.remainingTargetValue.textContent = formatNumber(
    snapshot.remainingTarget,
  );
  elements.remainingWorkableValue.textContent = formatNumber(
    snapshot.remainingWorkableDays,
  );
  elements.requiredPaceValue.textContent =
    snapshot.remainingWorkableDays > 0
      ? `${formatNumber(snapshot.requiredUtilizationRate)} / day`
      : "n/a";
  elements.statusValue.textContent = snapshot.statusLabel;
  elements.statusCard.dataset.tone = snapshot.statusTone;
  elements.paceCopy.textContent = buildPaceCopy(snapshot);
  elements.calendarCaption.textContent = `${snapshot.totalWorkableDays} workable days, ${snapshot.blockedDays} blocked days, ${snapshot.holidaysByIso.size} generated French holidays.`;
}

function render() {
  const snapshot = buildYearSnapshot(state);
  syncInputs();
  renderSummary(snapshot);
  renderCalendar(elements.calendarRoot, state, snapshot);
}

function updateStateFromInputs() {
  const nextYear = clamp(
    Number(elements.yearInput.value) || createDefaultState().year,
    2020,
    2100,
  );
  const nextTargetDays = clamp(
    Number(elements.targetDaysInput.value) || 216,
    0,
    366,
  );

  state.year = nextYear;
  state.targetDays = nextTargetDays;
  saveState(state);
  render();
}

elements.settingsForm.addEventListener("input", updateStateFromInputs);
elements.settingsForm.addEventListener("change", updateStateFromInputs);

render();
