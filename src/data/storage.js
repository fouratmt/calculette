(function attachStorage(global) {
  const STORAGE_KEY = "calculette-jours-homme/state";
  const DEFAULT_TARGET_DAYS = 216;
  const ALLOWED_YEARS = [2025, 2026, 2027];
  const VALID_OVERRIDE_STATUSES = new Set([
    "worked",
    "half_day",
    "vacation",
    "closed",
    "holiday",
  ]);
  const LEGACY_STATUS_MAP = {
    worked_full: "worked",
    worked_half: "half_day",
    not_worked: "vacation",
    company_closed: "closed",
    mandated_day_off: "closed",
    administrative_holiday: "holiday",
    available: null,
    weekend: null,
  };

  function getDefaultYear() {
    const currentYear = new Date().getFullYear();
    if (ALLOWED_YEARS.includes(currentYear)) {
      return currentYear;
    }

    if (currentYear < ALLOWED_YEARS[0]) {
      return ALLOWED_YEARS[0];
    }

    return ALLOWED_YEARS[ALLOWED_YEARS.length - 1];
  }

  function sanitizeYear(value, fallback) {
    const parsedYear = Number(value);
    if (ALLOWED_YEARS.includes(parsedYear)) {
      return parsedYear;
    }

    return fallback;
  }

  function normalizeOverrideStatus(status) {
    if (VALID_OVERRIDE_STATUSES.has(status)) {
      return status;
    }

    if (Object.prototype.hasOwnProperty.call(LEGACY_STATUS_MAP, status)) {
      return LEGACY_STATUS_MAP[status];
    }

    return null;
  }

  function createDefaultState(year) {
    const safeYear =
      typeof year === "undefined" ? getDefaultYear() : sanitizeYear(year, getDefaultYear());

    return {
      year: safeYear,
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

  function sanitizeDayOverrides(candidateOverrides) {
    if (
      !candidateOverrides ||
      typeof candidateOverrides !== "object" ||
      Array.isArray(candidateOverrides)
    ) {
      return {};
    }

    const sanitizedOverrides = {};

    for (const [isoDate, rawStatus] of Object.entries(candidateOverrides)) {
      const normalizedStatus = normalizeOverrideStatus(rawStatus);
      if (normalizedStatus) {
        sanitizedOverrides[isoDate] = normalizedStatus;
      }
    }

    return sanitizedOverrides;
  }

  function sanitizeState(candidateState) {
    const fallbackState = createDefaultState();
    if (!candidateState || typeof candidateState !== "object") {
      return fallbackState;
    }

    return {
      year: sanitizeYear(candidateState.year, fallbackState.year),
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
      dayOverrides: sanitizeDayOverrides(candidateState.dayOverrides),
    };
  }

  function loadState() {
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

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures so the UI stays functional in private browsing.
    }
  }

  global.Calculette.storage = {
    ALLOWED_YEARS,
    DEFAULT_TARGET_DAYS,
    VALID_OVERRIDE_STATUSES,
    createDefaultState,
    getDefaultYear,
    loadState,
    saveState,
  };
})(window);
