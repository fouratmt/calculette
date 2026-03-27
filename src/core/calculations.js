import {
  getMonthDays,
  isWeekend,
  startOfToday,
  toIsoDate,
} from "../lib/date-utils.js";
import { getFrenchHolidays } from "../data/holidays-fr.js";

export const STATUS_META = {
  available: {
    label: "Available",
    shortLabel: "",
    blocked: false,
    countedValue: 0,
  },
  worked_full: {
    label: "Full day worked",
    shortLabel: "1",
    blocked: false,
    countedValue: 1,
  },
  worked_half: {
    label: "Half day worked",
    shortLabel: "1/2",
    blocked: false,
    countedValue: 0.5,
  },
  not_worked: {
    label: "Not worked",
    shortLabel: "0",
    blocked: false,
    countedValue: 0,
  },
  company_closed: {
    label: "Company closed",
    shortLabel: "CL",
    blocked: true,
    countedValue: 0,
  },
  administrative_holiday: {
    label: "Administrative holiday",
    shortLabel: "FR",
    blocked: true,
    countedValue: 0,
  },
  mandated_day_off: {
    label: "Mandated day off",
    shortLabel: "MD",
    blocked: true,
    countedValue: 0,
  },
  weekend: {
    label: "Weekend",
    shortLabel: "WE",
    blocked: true,
    countedValue: 0,
  },
};

function isIntrinsicBlocked(status) {
  return (
    status === "weekend" ||
    status === "administrative_holiday" ||
    status === "company_closed" ||
    status === "mandated_day_off"
  );
}

export function getEffectiveDayRecord(date, state, holidaysByIso) {
  const isoDate = toIsoDate(date);
  const overrideStatus = state.dayOverrides[isoDate];
  const holiday = holidaysByIso.get(isoDate) ?? null;

  if (overrideStatus) {
    return {
      status: overrideStatus,
      source: "override",
      holidayName: holiday?.name ?? null,
      holidayShortLabel: holiday?.shortLabel ?? "",
    };
  }

  if (state.settings.weekendsAreBlocked && isWeekend(date)) {
    return {
      status: "weekend",
      source: "rule",
      holidayName: null,
      holidayShortLabel: "",
    };
  }

  if (holiday) {
    return {
      status: holiday.status,
      source: "holiday",
      holidayName: holiday.name,
      holidayShortLabel: holiday.shortLabel,
    };
  }

  return {
    status: "available",
    source: "default",
    holidayName: null,
    holidayShortLabel: "",
  };
}

function getStatusTone(requiredUtilizationRate, remainingTarget, remainingWorkableDays) {
  if (remainingTarget <= 0) {
    return "ahead";
  }

  if (remainingWorkableDays <= 0) {
    return "impossible";
  }

  if (requiredUtilizationRate > 1) {
    return "impossible";
  }

  if (requiredUtilizationRate > 0.9) {
    return "behind";
  }

  if (requiredUtilizationRate > 0.75) {
    return "at_risk";
  }

  if (requiredUtilizationRate > 0.55) {
    return "on_track";
  }

  return "ahead";
}

function getStatusLabel(tone) {
  switch (tone) {
    case "ahead":
      return "Ahead";
    case "on_track":
      return "On track";
    case "at_risk":
      return "At risk";
    case "behind":
      return "Behind";
    default:
      return "Impossible";
  }
}

export function buildYearSnapshot(state, referenceDate = startOfToday()) {
  const holidaysByIso = getFrenchHolidays(state.year);
  const recordsByIso = new Map();

  let workedEquivalentDays = 0;
  let totalWorkableDays = 0;
  let remainingWorkableDays = 0;
  let blockedDays = 0;

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthDays = getMonthDays(state.year, monthIndex);

    for (const date of monthDays) {
      const record = getEffectiveDayRecord(date, state, holidaysByIso);
      const isoDate = toIsoDate(date);
      recordsByIso.set(isoDate, record);

      const meta = STATUS_META[record.status] ?? STATUS_META.available;
      if (meta.countedValue > 0) {
        workedEquivalentDays += meta.countedValue;
      }

      if (isIntrinsicBlocked(record.status)) {
        blockedDays += 1;
      } else {
        totalWorkableDays += 1;
      }

      const isRemainingWindow =
        state.year > referenceDate.getFullYear() ||
        (state.year === referenceDate.getFullYear() && date >= referenceDate);

      if (
        isRemainingWindow &&
        !isIntrinsicBlocked(record.status) &&
        record.status !== "not_worked"
      ) {
        remainingWorkableDays += 1;
      }
    }
  }

  const remainingTarget = Math.max(0, state.targetDays - workedEquivalentDays);
  const requiredUtilizationRate =
    remainingWorkableDays > 0 ? remainingTarget / remainingWorkableDays : 0;
  const statusTone = getStatusTone(
    requiredUtilizationRate,
    remainingTarget,
    remainingWorkableDays,
  );

  return {
    recordsByIso,
    holidaysByIso,
    workedEquivalentDays,
    totalWorkableDays,
    blockedDays,
    remainingTarget,
    remainingWorkableDays,
    requiredUtilizationRate,
    statusTone,
    statusLabel: getStatusLabel(statusTone),
  };
}
