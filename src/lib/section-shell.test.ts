import { describe, expect, it } from "vitest";
import { isSectionShell } from "@/lib/section-shell";

describe("esqueleto das seções", () => {
  it("usa o mesmo esqueleto em desafios, mercado e carteira", () => {
    expect(isSectionShell("/")).toBe(true);
    expect(isSectionShell("/mercado")).toBe(true);
    expect(isSectionShell("/mercado/ticket")).toBe(true);
    expect(isSectionShell("/carteira")).toBe(true);
    expect(isSectionShell("/carteira/saque")).toBe(true);
  });

  it("mantém o cabeçalho compacto fora dessas seções", () => {
    expect(isSectionShell("/entrar")).toBe(false);
    expect(isSectionShell("/conta")).toBe(false);
    expect(isSectionShell("/desafios/copa")).toBe(false);
  });
});
