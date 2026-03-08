const KORAIL_DATE_TIME_PATTERN = /^\d{14}$/;
const KORAIL_TIMEZONE_OFFSET_MINUTES = 9 * 60;

export function parseKorailDateTime(value: string): Date {
  if (!KORAIL_DATE_TIME_PATTERN.test(value)) {
    throw new Error(`Invalid Korail date time format: ${value}`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));

  validateDateParts({ year, month, day, hour, minute, second }, value);

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    KORAIL_TIMEZONE_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcTimestamp);
}

function validateDateParts(
  parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  },
  originalValue: string,
) {
  const { year, month, day, hour, minute, second } = parts;

  if (month < 1 || month > 12) {
    throw new Error(`Invalid Korail date time value: ${originalValue}`);
  }

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error(`Invalid Korail date time value: ${originalValue}`);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid Korail date time value: ${originalValue}`);
  }
}
