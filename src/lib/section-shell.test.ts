import { describe, expect, it } from "vitest";
import { desafiosContentShift, desafiosPane, isSectionShell } from "@/lib/section-shell";

describe("esqueleto das seções", () => {
  it("usa o mesmo esqueleto em desafios, mercado e carteira", () => {
    expect(isSectionShell("/")).toBe(true);
    expect(isSectionShell("/desafios/copa")).toBe(true);
    expect(isSectionShell("/mercado")).toBe(true);
    expect(isSectionShell("/mercado/ticket")).toBe(true);
    expect(isSectionShell("/carteira")).toBe(true);
    expect(isSectionShell("/carteira/saque")).toBe(true);
  });

  it("mantém o cabeçalho compacto fora dessas seções", () => {
    expect(isSectionShell("/entrar")).toBe(false);
    expect(isSectionShell("/conta")).toBe(false);
  });
});

describe("troca do conteúdo de Desafios", () => {
  it("reconhece listagem e evolução", () => {
    expect(desafiosPane("/")).toBe("list");
    expect(desafiosPane("/desafios/copa")).toBe("evolution");
    expect(desafiosPane("/mercado")).toBe(null);
  });

  it("anima só entre a listagem e a evolução", () => {
    expect(desafiosContentShift("/", "/desafios/copa")).toBe("forward");
    expect(desafiosContentShift("/desafios/copa", "/")).toBe("back");
    expect(desafiosContentShift("/desafios/copa", "/desafios/estadual")).toBe("forward");
    expect(desafiosContentShift("/", "/")).toBe(null);
    expect(desafiosContentShift("/", "/mercado")).toBe(null);
    expect(desafiosContentShift("/desafios/copa", "/carteira")).toBe(null);
  });
});
