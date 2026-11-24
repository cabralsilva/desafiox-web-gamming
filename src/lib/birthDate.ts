const MIN_AGE = 18;
const TIME_ZONE = "America/Sao_Paulo";

export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

/** Máscara progressiva dd/mm/aaaa a partir de dígitos. */
export function maskBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** yyyy-mm-dd → dd/mm/aaaa. Dia civil, sem deslocar fuso. */
export function isoToBirthDateBR(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function civilDateInTimeZone(date: Date, timeZone = TIME_ZONE): CivilDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return { year, month, day };
}

function isRealCalendarDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function compareCivil(left: CivilDate, right: CivilDate): number {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

export function ageYearsOn(born: CivilDate, today: CivilDate): number {
  let age = today.year - born.year;
  if (today.month < born.month || (today.month === born.month && today.day < born.day)) age -= 1;
  return age;
}

/**
 * Valida dd/mm/aaaa no dia civil de America/Sao_Paulo.
 * Data inválida, futura ou de menor de 18 anos não grava.
 */
export function assertAdultBirthDateBR(
  value: string,
  options?: { minAge?: number; today?: CivilDate },
): { ok: true; isoDate: string } | { ok: false; message: string } {
  const minAge = options?.minAge ?? MIN_AGE;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return { ok: false, message: "Informe a data de nascimento no formato dd/mm/aaaa." };
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isRealCalendarDay(year, month, day)) {
    return { ok: false, message: "Informe a data de nascimento no formato dd/mm/aaaa." };
  }
  const born = { year, month, day };
  const today = options?.today ?? civilDateInTimeZone(new Date());
  if (compareCivil(born, today) > 0) {
    return { ok: false, message: "A data de nascimento não pode ser futura." };
  }
  if (ageYearsOn(born, today) < minAge) {
    return { ok: false, message: `É necessário ter ${minAge} anos ou mais.` };
  }
  const isoMonth = String(month).padStart(2, "0");
  const isoDay = String(day).padStart(2, "0");
  return { ok: true, isoDate: `${year}-${isoMonth}-${isoDay}` };
}

export { MIN_AGE };
