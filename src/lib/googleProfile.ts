import { isoToBirthDateBR } from "@/lib/birthDate";
import { maskPhoneInput, nationalPhoneDigits } from "@/lib/phone";

type GoogleBirthday = {
  date?: { year?: number; month?: number; day?: number };
};

type GooglePhoneNumber = {
  canonicalForm?: string;
  value?: string;
};

/** Escopos do Embedded Signup Google: identidade, aniversário e telefone, quando a conta tiver. */
export const GOOGLE_EMBEDDED_SIGNUP_SCOPE =
  "openid email profile https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.phonenumbers.read";

export function pickGoogleBirthIso(birthdays: unknown): string | null {
  if (!Array.isArray(birthdays)) return null;
  for (const item of birthdays as GoogleBirthday[]) {
    const date = item?.date;
    if (!date?.year || !date.month || !date.day || date.year < 1900) continue;
    const month = String(date.month).padStart(2, "0");
    const day = String(date.day).padStart(2, "0");
    return `${date.year}-${month}-${day}`;
  }
  return null;
}

export function pickGoogleNationalPhone(phoneNumbers: unknown): string | null {
  if (!Array.isArray(phoneNumbers)) return null;
  for (const item of phoneNumbers as GooglePhoneNumber[]) {
    const national = nationalPhoneDigits(item?.canonicalForm || item?.value || "");
    if (national) return national;
  }
  return null;
}

export type GoogleAccountHints = {
  birthDateBR: string;
  phone: string;
};

/** People API no navegador. Falha vira campos vazios: a pessoa preenche na hora. */
export async function fetchGoogleAccountHints(accessToken: string): Promise<GoogleAccountHints> {
  const empty = { birthDateBR: "", phone: "" };
  try {
    const url = new URL("https://people.googleapis.com/v1/people/me");
    url.searchParams.set("personFields", "birthdays,phoneNumbers");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return empty;
    const data = (await response.json()) as { birthdays?: unknown; phoneNumbers?: unknown };
    const iso = pickGoogleBirthIso(data.birthdays);
    const phone = pickGoogleNationalPhone(data.phoneNumbers);
    return {
      birthDateBR: iso ? isoToBirthDateBR(iso) : "",
      phone: phone ? maskPhoneInput(phone) : "",
    };
  } catch {
    return empty;
  }
}
