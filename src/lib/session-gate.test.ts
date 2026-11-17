import { describe, expect, it } from "vitest";
import { createApiClient } from "@/lib/api";
import { publicChallengePath } from "@/lib/queries/publicChallenges";
import { readBalanceAfter, sessionBalancePath } from "@/lib/queries/sessionBalance";
import { consumeReturnIntent, saveReturnIntent } from "@/lib/returnIntent";
import { deleteToken, readToken, writeToken } from "@/lib/session";
import { PUBLIC_CHALLENGE_POPULATE, PUBLIC_CHALLENGE_SELECT } from "@/types/publicChallenge";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("consulta de exemplo", () => {
  it("documenta populate e select e não coloca o token na query", () => {
    const path = publicChallengePath({ page: 1, limit: 1 });
    const params = new URL(`http://api.test${path}`).searchParams;
    expect(params.get("populate")).toBe(PUBLIC_CHALLENGE_POPULATE);
    expect(params.get("select")).toBe(PUBLIC_CHALLENGE_SELECT);
    expect(params.get("token")).toBeNull();
    expect(params.get("access_token")).toBeNull();
    expect(params.get("orderBy")).toBe("_id");
    expect(params.get("orderSense")).toBe("desc");
    const ordered = publicChallengePath({ page: 1, limit: 1, orderBy: "name", orderSense: "asc" });
    const orderedParams = new URL(`http://api.test${ordered}`).searchParams;
    expect(orderedParams.get("orderBy")).toBe("name");
    expect(orderedParams.get("orderSense")).toBe("asc");
  });
});

describe("sessão", () => {
  it("persiste o JWT e apaga no 401 sem redirecionar", async () => {
    const store = memoryStore();
    writeToken(store, "jwt-valido");
    let cleared = false;
    let requested = "";
    let authorization: string | null = null;

    const request = createApiClient({
      baseUrl: "http://api.test",
      getToken: () => readToken(store),
      onUnauthorized: () => {
        deleteToken(store);
        cleared = true;
      },
      fetchFn: async (url, init) => {
        requested = String(url);
        authorization = new Headers(init?.headers).get("authorization");
        return new Response("{}", { status: 401 });
      },
    });

    const response = await request(publicChallengePath({ page: 1, limit: 1 }), { auth: true });

    expect(response.status).toBe(401);
    expect(cleared).toBe(true);
    expect(readToken(store)).toBeNull();
    expect(authorization).toBe("Bearer jwt-valido");
    expect(requested.includes("jwt-valido")).toBe(false);
    expect(requested.includes("populate=")).toBe(true);
  });

  it("não limpa a sessão quando a consulta é pública", async () => {
    const store = memoryStore();
    writeToken(store, "jwt-valido");
    let cleared = false;
    const request = createApiClient({
      baseUrl: "http://api.test",
      getToken: () => readToken(store),
      onUnauthorized: () => {
        cleared = true;
      },
      fetchFn: async () => new Response("{}", { status: 401 }),
    });

    await request(sessionBalancePath(), { auth: false });
    expect(cleared).toBe(false);
    expect(readToken(store)).toBe("jwt-valido");
  });
});

describe("retorno da intenção", () => {
  it("guarda a rota e o diálogo e consome uma vez", () => {
    const store = memoryStore();
    saveReturnIntent({ pathname: "/", search: "?dialog=exemplo", dialog: "exemplo" }, store);
    expect(consumeReturnIntent(store)).toEqual({
      pathname: "/",
      search: "?dialog=exemplo",
      dialog: "exemplo",
    });
    expect(consumeReturnIntent(store)).toBeNull();
  });

  it("recusa um destino fora do site", () => {
    const store = memoryStore();
    saveReturnIntent({ pathname: "https://evil.test", search: "", dialog: null }, store);
    expect(consumeReturnIntent(store)).toBeNull();
  });
});

describe("saldo", () => {
  it("lê balanceAfter e pede só esse campo", () => {
    const params = new URL(`http://api.test${sessionBalancePath()}`).searchParams;
    expect(params.get("select")).toBe("balanceAfter");
    expect(readBalanceAfter({ items: [{ balanceAfter: 42.5 }] })).toBe(42.5);
  });
});
