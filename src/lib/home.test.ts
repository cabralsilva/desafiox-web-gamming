import { ChallengeStatus } from "c2-desafiox";
import { describe, expect, it } from "vitest";
import { orderedBannerSlides } from "@/lib/banner";
import { isCurrentPricingWindow } from "@/lib/dates";
import { buildPaging, readPage, readPaging, sliceByPaging } from "@/lib/paging";
import { challengeHref, listChallenges, parseChallengeQuery } from "@/lib/queries/challengeList";
import { sanitizeRulesHtml } from "@/lib/sanitize-html";
import { publicChallengePage, sessionChallengePage } from "@/mocks";

describe("paginação", () => {
  it("monta o envelope que a pesquisa da API devolve", () => {
    expect(buildPaging(52, 1, 50)).toEqual({
      total: 52,
      page: 1,
      limit: 50,
      totalPages: 2,
      startIndex: 1,
      endIndex: 50,
    });
    expect(buildPaging(52, 2, 50)).toEqual({
      total: 52,
      page: 2,
      limit: 50,
      totalPages: 2,
      startIndex: 51,
      endIndex: 52,
    });
  });

  it("lê items e paging sem recalcular os índices", () => {
    const payload = {
      items: ["copa"],
      paging: {
        total: 52,
        page: 1,
        limit: 50,
        totalPages: 2,
        startIndex: 1,
        endIndex: 50,
      },
    };
    expect(readPaging(payload.paging)).toEqual(payload.paging);
    expect(readPage(payload, (item) => (typeof item === "string" ? item : null))).toEqual(payload);
    expect(sliceByPaging(["a", "b", "c"], payload.paging)).toEqual(["a", "b", "c"]);
  });
});

describe("lista de desafios", () => {
  const guest = {
    q: "",
    status: null,
    tickets: null,
    page: 1,
    orderBy: "_id",
    orderSense: "desc",
    view: "grid",
    signedIn: false,
  } as const;

  it("pagina 12 itens e usa os campos do envelope", () => {
    const base = publicChallengePage.items[0];
    const many = Array.from({ length: 13 }, (_, index) => ({
      ...base,
      _id: `id-${index}`,
      name: `Desafio ${index + 1}`,
      slug: `desafio-${index + 1}`,
    }));
    const page = listChallenges(many, { ...guest, page: 2, orderBy: "name", orderSense: "asc" });
    expect(page.paging).toEqual({
      total: 13,
      page: 2,
      limit: 12,
      totalPages: 2,
      startIndex: 13,
      endIndex: 13,
    });
    expect(page.items.map((item) => item.name)).toEqual(["Desafio 13"]);
  });

  it("ordena pelo campo e pelo sentido da consulta", () => {
    const byName = listChallenges(publicChallengePage.items, { ...guest, orderBy: "name", orderSense: "asc" });
    expect(byName.items.map((item) => item.slug)).toEqual([
      "brasileirao-sobrevivencia",
      "copa-sobrevivencia",
      "estadual-sobrevivencia",
    ]);
    const byPrize = listChallenges(publicChallengePage.items, {
      ...guest,
      orderBy: "budgetAccumulated",
      orderSense: "asc",
    });
    expect(byPrize.items.map((item) => item.slug)).toEqual([
      "estadual-sobrevivencia",
      "copa-sobrevivencia",
      "brasileirao-sobrevivencia",
    ]);
  });

  it("mantém uma tag por grupo e o segundo clique limpa", () => {
    const base = {
      q: "",
      status: null,
      tickets: null,
      page: 3,
      orderBy: "_id",
      orderSense: "desc" as const,
      view: "grid" as const,
    };
    const selected = challengeHref(base, { status: ChallengeStatus.RUNNING, page: 1 });
    expect(selected).toBe(`/?status=${ChallengeStatus.RUNNING}`);
    const parsed = parseChallengeQuery({ status: ChallengeStatus.RUNNING, page: "1" });
    expect(challengeHref(parsed, { status: null, page: 1 })).toBe("/");
    expect(challengeHref(base, { orderBy: "name", orderSense: "asc", view: "list", page: 1 })).toBe(
      "/?orderBy=name&orderSense=asc&view=list",
    );
    expect(parseChallengeQuery({ status: "DRAFT" }).status).toBeNull();
  });

  it("busca pelo nome e ignora meus tickets sem sessão", () => {
    const found = listChallenges(publicChallengePage.items, { ...guest, q: "copa" });
    expect(found.items.map((item) => item.slug)).toEqual(["copa-sobrevivencia"]);
    const ignored = listChallenges(publicChallengePage.items, { ...guest, tickets: "active" });
    expect(ignored.paging.total).toBe(publicChallengePage.items.length);
  });

  it("filtra ativos e eliminados só com sessão", () => {
    const active = listChallenges(sessionChallengePage.items, { ...guest, signedIn: true, tickets: "active" });
    expect(active.items.map((item) => item.slug)).toEqual(["brasileirao-sobrevivencia"]);
    const eliminated = listChallenges(sessionChallengePage.items, {
      ...guest,
      signedIn: true,
      tickets: "eliminated",
    });
    expect(eliminated.items.map((item) => item.slug)).toEqual(["estadual-sobrevivencia"]);
  });
});

describe("regras e banner", () => {
  it("remove script e mantém o HTML da regra", () => {
    const html = `<p>Prêmio</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a>`;
    const safe = sanitizeRulesHtml(html);
    expect(safe).toContain("<p>Prêmio</p>");
    expect(safe.toLowerCase()).not.toContain("script");
    expect(safe.toLowerCase()).not.toContain("onerror");
    expect(safe.toLowerCase()).not.toContain("javascript:");
  });

  it("some quando não há slides", () => {
    expect(orderedBannerSlides([])).toEqual([]);
    expect(orderedBannerSlides([{ id: "vazio", imageUrl: " ", alt: "", href: "/", order: 1 }])).toEqual([]);
  });

  it("marca a janela de venda vigente", () => {
    const window = {
      initDateTime: "2026-06-01T03:00:00.000Z",
      endDateTime: "2026-06-10T02:59:59.000Z",
    };
    expect(isCurrentPricingWindow(window, new Date("2026-06-05T12:00:00.000Z"))).toBe(true);
    expect(isCurrentPricingWindow(window, new Date("2026-11-17T12:00:00.000Z"))).toBe(false);
  });
});
