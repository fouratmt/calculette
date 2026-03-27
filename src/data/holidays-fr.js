import { addDays, createDateAtNoon, toIsoDate } from "../lib/date-utils.js";

function getEasterSunday(year) {
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const leapCorrection = Math.floor(century / 4);
  const remainderCentury = century % 4;
  const moonCorrection = Math.floor((century + 8) / 25);
  const correction = Math.floor((century - moonCorrection + 1) / 3);
  const goldenNumber = year % 19;
  const epact =
    (19 * goldenNumber + century - leapCorrection - correction + 15) % 30;
  const yearLeap = Math.floor(yearInCentury / 4);
  const yearRemainder = yearInCentury % 4;
  const weekDayCorrection =
    (32 + 2 * remainderCentury + 2 * yearLeap - epact - yearRemainder) % 7;
  const monthOffset = Math.floor((goldenNumber + 11 * epact + 22 * weekDayCorrection) / 451);
  const month = Math.floor((epact + weekDayCorrection - 7 * monthOffset + 114) / 31);
  const day = ((epact + weekDayCorrection - 7 * monthOffset + 114) % 31) + 1;

  return createDateAtNoon(year, month - 1, day);
}

export function getFrenchHolidays(year) {
  const easterSunday = getEasterSunday(year);

  const holidays = [
    { date: createDateAtNoon(year, 0, 1), name: "Jour de l'an", shortLabel: "NY" },
    { date: addDays(easterSunday, 1), name: "Easter Monday", shortLabel: "EM" },
    { date: createDateAtNoon(year, 4, 1), name: "Labour Day", shortLabel: "LD" },
    { date: createDateAtNoon(year, 4, 8), name: "Victory Day", shortLabel: "VD" },
    { date: addDays(easterSunday, 39), name: "Ascension Day", shortLabel: "AD" },
    { date: addDays(easterSunday, 50), name: "Whit Monday", shortLabel: "WM" },
    { date: createDateAtNoon(year, 6, 14), name: "Bastille Day", shortLabel: "BD" },
    { date: createDateAtNoon(year, 7, 15), name: "Assumption", shortLabel: "AS" },
    { date: createDateAtNoon(year, 10, 1), name: "All Saints' Day", shortLabel: "SA" },
    { date: createDateAtNoon(year, 10, 11), name: "Armistice Day", shortLabel: "AR" },
    { date: createDateAtNoon(year, 11, 25), name: "Christmas Day", shortLabel: "XD" },
  ];

  return new Map(
    holidays.map((holiday) => [
      toIsoDate(holiday.date),
      {
        ...holiday,
        status: "administrative_holiday",
      },
    ]),
  );
}
