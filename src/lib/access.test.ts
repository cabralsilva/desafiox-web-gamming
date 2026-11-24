import { describe, expect, it } from "vitest";
import { assertAdultBirthDateBR, civilDateInTimeZone, isoToBirthDateBR, maskBirthDateInput } from "@/lib/birthDate";
import { maskPhoneInput, nationalPhoneDigits } from "@/lib/phone";
import { pickGoogleBirthIso, pickGoogleNationalPhone } from "@/lib/googleProfile";

const today = { year: 2026, month: 11, day: 24 };

describe("data de nascimento", () => {
  it("mascara e converte o dia civil", () => {
    expect(maskBirthDateInput("24082008")).toBe("24/08/2008");
    expect(isoToBirthDateBR("2008-08-24")).toBe("24/08/2008");
  });

  it("recusa data inválida, futura e de menor de 18 anos", () => {
    expect(assertAdultBirthDateBR("31/02/2000", { today }).ok).toBe(false);
    expect(assertAdultBirthDateBR("29/02/2001", { today }).ok).toBe(false);
    expect(assertAdultBirthDateBR("", { today }).ok).toBe(false);
    const future = assertAdultBirthDateBR("25/11/2026", { today });
    expect(future).toEqual({ ok: false, message: "A data de nascimento não pode ser futura." });
    const minor = assertAdultBirthDateBR("25/11/2008", { today });
    expect(minor).toEqual({ ok: false, message: "É necessário ter 18 anos ou mais." });
  });

  it("aceita quem completa 18 anos no dia civil", () => {
    expect(assertAdultBirthDateBR("24/11/2008", { today })).toEqual({ ok: true, isoDate: "2008-11-24" });
    expect(assertAdultBirthDateBR("23/11/2008", { today })).toEqual({ ok: true, isoDate: "2008-11-23" });
  });

  it("usa o dia civil de São Paulo", () => {
    expect(civilDateInTimeZone(new Date("2026-11-24T02:30:00.000Z"))).toEqual({
      year: 2026,
      month: 11,
      day: 23,
    });
    expect(civilDateInTimeZone(new Date("2026-11-24T03:00:00.000Z"))).toEqual({
      year: 2026,
      month: 11,
      day: 24,
    });
  });
});

describe("telefone", () => {
  it("normaliza para DDD e número, sem DDI", () => {
    expect(nationalPhoneDigits("(11) 99999-0000")).toBe("11999990000");
    expect(nationalPhoneDigits("+55 11 99999-0000")).toBe("11999990000");
    expect(nationalPhoneDigits("1133334444")).toBe("1133334444");
    expect(nationalPhoneDigits("999")).toBeNull();
    expect(nationalPhoneDigits("00999990000")).toBeNull();
  });

  it("aplica a máscara enquanto digita", () => {
    expect(maskPhoneInput("11999990000")).toBe("(11) 99999-0000");
    expect(maskPhoneInput("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("dados da conta Google", () => {
  it("lê aniversário com ano e o telefone nacional", () => {
    expect(
      pickGoogleBirthIso([
        { date: { month: 8, day: 24 } },
        { date: { year: 2008, month: 8, day: 24 } },
      ]),
    ).toBe("2008-08-24");
    expect(
      pickGoogleNationalPhone([
        { value: "sem numero" },
        { canonicalForm: "+5511999990000" },
      ]),
    ).toBe("11999990000");
  });
});
