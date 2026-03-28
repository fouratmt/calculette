(function attachStorage(global) {
  const STORAGE_KEY = "calculette-jours-homme/state";
  const DEFAULT_TARGET_DAYS = 216;
  const ALLOWED_YEARS = [2025, 2026, 2027, 2028];
  const SESSION_SCHEMA_VERSION = 2;
  const VALID_OVERRIDE_STATUSES = new Set([
    "worked_full",
    "worked_half",
    "not_worked",
    "company_closed",
    "administrative_holiday",
  ]);
  const STATUS_ALIASES = {
    worked_full: "worked_full",
    worked: "worked_full",
    worked_half: "worked_half",
    half_day: "worked_half",
    not_worked: "not_worked",
    vacation: "not_worked",
    company_closed: "company_closed",
    closed: "company_closed",
    administrative_holiday: "administrative_holiday",
    holiday: "administrative_holiday",
    mandated_day_off: "company_closed",
    available: null,
    weekend: null,
  };

  function generateSessionId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }

    return `session-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function isValidTimestamp(value) {
    if (typeof value !== "string") {
      return false;
    }

    return Number.isFinite(new Date(value).getTime());
  }

  function createSessionMeta(candidateMeta) {
    const nowIso = new Date().toISOString();
    const createdAt = isValidTimestamp(candidateMeta?.createdAt)
      ? candidateMeta.createdAt
      : nowIso;
    const updatedAt = isValidTimestamp(candidateMeta?.updatedAt)
      ? candidateMeta.updatedAt
      : createdAt;

    return {
      sessionId:
        typeof candidateMeta?.sessionId === "string" &&
        candidateMeta.sessionId.trim()
          ? candidateMeta.sessionId
          : generateSessionId(),
      schemaVersion: SESSION_SCHEMA_VERSION,
      createdAt,
      updatedAt,
    };
  }

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

    if (Object.prototype.hasOwnProperty.call(STATUS_ALIASES, status)) {
      return STATUS_ALIASES[status];
    }

    return null;
  }

  function createDefaultYearState() {
    return {
      targetDays: DEFAULT_TARGET_DAYS,
      dayOverrides: {},
    };
  }

  function createDefaultState(year) {
    const safeYear =
      typeof year === "undefined" ? getDefaultYear() : sanitizeYear(year, getDefaultYear());

    return {
      year: safeYear,
      meta: createSessionMeta(),
      settings: {
        countryHolidayPreset: "FR",
        weekendsAreBlocked: true,
        estimationMode: "workable_days_only",
      },
      years: {
        [safeYear]: createDefaultYearState(),
      },
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

  function sanitizeYearState(candidateYearState) {
    const fallbackYearState = createDefaultYearState();

    return {
      targetDays: sanitizeNumber(
        candidateYearState?.targetDays,
        fallbackYearState.targetDays,
        0,
        366,
      ),
      dayOverrides: sanitizeDayOverrides(candidateYearState?.dayOverrides),
    };
  }

  function getIsoYear(isoDate) {
    const parsedYear = Number(String(isoDate).slice(0, 4));
    return ALLOWED_YEARS.includes(parsedYear) ? parsedYear : null;
  }

  function buildLegacyYears(candidateState) {
    const legacyYears = {};
    const selectedYear = sanitizeYear(candidateState?.year, getDefaultYear());
    const selectedYearKey = String(selectedYear);
    legacyYears[selectedYearKey] = createDefaultYearState();
    legacyYears[selectedYearKey].targetDays = sanitizeNumber(
      candidateState?.targetDays,
      DEFAULT_TARGET_DAYS,
      0,
      366,
    );

    const sanitizedOverrides = sanitizeDayOverrides(candidateState?.dayOverrides);
    for (const [isoDate, status] of Object.entries(sanitizedOverrides)) {
      const overrideYear = getIsoYear(isoDate);
      if (!overrideYear) {
        continue;
      }

      const overrideYearKey = String(overrideYear);
      if (!legacyYears[overrideYearKey]) {
        legacyYears[overrideYearKey] = createDefaultYearState();
      }

      legacyYears[overrideYearKey].dayOverrides[isoDate] = status;
    }

    return legacyYears;
  }

  function sanitizeYears(candidateState, selectedYear) {
    const sanitizedYears = {};
    const selectedYearKey = String(selectedYear);
    const candidateYears =
      candidateState?.years &&
      typeof candidateState.years === "object" &&
      !Array.isArray(candidateState.years)
        ? candidateState.years
        : null;

    if (candidateYears) {
      for (const allowedYear of ALLOWED_YEARS) {
        const yearKey = String(allowedYear);
        const candidateYearState = candidateYears[yearKey];
        if (!candidateYearState) {
          continue;
        }

        sanitizedYears[yearKey] = sanitizeYearState(candidateYearState);
      }
    }

    const legacyYears = buildLegacyYears(candidateState);
    for (const [yearKey, legacyYearState] of Object.entries(legacyYears)) {
      if (!sanitizedYears[yearKey]) {
        sanitizedYears[yearKey] = legacyYearState;
        continue;
      }

      sanitizedYears[yearKey].dayOverrides = Object.assign(
        {},
        legacyYearState.dayOverrides,
        sanitizedYears[yearKey].dayOverrides,
      );
    }

    if (!sanitizedYears[selectedYearKey]) {
      sanitizedYears[selectedYearKey] = createDefaultYearState();
    }

    return sanitizedYears;
  }

  function sanitizeState(candidateState) {
    const fallbackState = createDefaultState();
    if (!candidateState || typeof candidateState !== "object") {
      return fallbackState;
    }

    const selectedYear = sanitizeYear(candidateState.year, fallbackState.year);

    return {
      year: selectedYear,
      meta: createSessionMeta(candidateState.meta),
      settings: {
        countryHolidayPreset: "FR",
        weekendsAreBlocked:
          candidateState.settings?.weekendsAreBlocked !== false,
        estimationMode: "workable_days_only",
      },
      years: sanitizeYears(candidateState, selectedYear),
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
    const sanitizedState = sanitizeState(state);
    sanitizedState.meta.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
    } catch {
      // Ignore storage failures so the UI stays functional in private browsing.
    }

    return sanitizedState;
  }

  function ensureYearState(state, year) {
    const safeYear = sanitizeYear(year, getDefaultYear());
    const yearKey = String(safeYear);

    if (
      !state.years ||
      typeof state.years !== "object" ||
      Array.isArray(state.years)
    ) {
      state.years = {};
    }

    if (!state.years[yearKey]) {
      state.years[yearKey] = createDefaultYearState();
      return state.years[yearKey];
    }

    state.years[yearKey] = sanitizeYearState(state.years[yearKey]);
    return state.years[yearKey];
  }

  function getYearState(state, year) {
    return ensureYearState(state, year);
  }

  function resetYearState(state, year) {
    const sanitizedState = sanitizeState(state);
    const safeYear = sanitizeYear(year, sanitizedState.year);
    sanitizedState.years[String(safeYear)] = createDefaultYearState();
    sanitizedState.year = safeYear;
    return saveState(sanitizedState);
  }

  function removeStoredState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures to keep the UI usable.
    }

    return createDefaultState();
  }

  global.Calculette.storage = {
    ALLOWED_YEARS,
    DEFAULT_TARGET_DAYS,
    STORAGE_KEY,
    VALID_OVERRIDE_STATUSES,
    createDefaultState,
    createDefaultYearState,
    ensureYearState,
    getDefaultYear,
    getYearState,
    loadState,
    removeStoredState,
    resetYearState,
    sanitizeState,
    saveState,
  };
})(window);
