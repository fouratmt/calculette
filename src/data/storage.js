const STORAGE_KEY = "calculette/state";
export const DEFAULT_TARGET_DAYS = 216;

function getCurrentYear() {
  return new Date().getFullYear();
}

export function createDefaultState(year = getCurrentYear()) {
  return {
    year,
    targetDays: DEFAULT_TARGET_DAYS,
    settings: {
      countryHolidayPreset: "FR",
      weekendsAreBlocked: true,
      estimationMode: "workable_days_only",
    },
    dayOverrides: {},
  };
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sanitizeNumber(value, fallback, min, max) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, min), max);
}

function sanitizeState(candidateState) {
  const fallbackState = createDefaultState();
  if (!candidateState || typeof candidateState !== "object") {
    return fallbackState;
  }

  return {
    year: sanitizeNumber(candidateState.year, fallbackState.year, 2020, 2100),
    targetDays: sanitizeNumber(
      candidateState.targetDays,
      fallbackState.targetDays,
      0,
      366,
    ),
    settings: {
      countryHolidayPreset: "FR",
      weekendsAreBlocked:
        candidateState.settings?.weekendsAreBlocked !== false,
      estimationMode: "workable_days_only",
    },
    dayOverrides:
      candidateState.dayOverrides &&
      typeof candidateState.dayOverrides === "object" &&
      !Array.isArray(candidateState.dayOverrides)
        ? candidateState.dayOverrides
        : {},
  };
}

export function loadState() {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return createDefaultState();
    }

    return sanitizeState(safeParseJson(rawState));
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures so the UI stays functional in private browsing.
  }
}
