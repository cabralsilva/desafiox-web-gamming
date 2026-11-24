import { describe, expect, it } from "vitest";
import { createApiClient } from "@/lib/api";
import {
  EMAIL_SIGN_IN_PATH,
  GOOGLE_SIGNUP_PROFILE_PATH,
  GOOGLE_SIGN_IN_PATH,
  PHONE_SIGN_IN_CONFIRM_PATH,
  PHONE_SIGN_IN_PATH,
  SIGNUP_PHONE_CONFIRM_PATH,
  SIGNUP_PHONE_RESEND_PATH,
  authDialogIsOpen,
  completeGoogleSignup,
  confirmPhoneSignIn,
  confirmSignupPhoneCode,
  emailBasicAuthorization,
  isMissingGoogleAccount,
  requestPhoneSignIn,
  resendSignupPhoneCode,
  signInExistingGoogle,
  signInWithEmail,
} from "@/lib/auth";

function capture() {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const request = createApiClient({
    baseUrl: "http://api.test",
    getToken: () => "sessao",
    onUnauthorized: () => {
      throw new Error("não deveria limpar a sessão");
    },
    fetchFn: async (url, init) => {
      calls.push({ url: String(url), init });
      const path = String(url).replace("http://api.test", "");
      if (path === GOOGLE_SIGN_IN_PATH) {
        return new Response(JSON.stringify({ message: "Conta não encontrada. Cadastre-se primeiro para usar o Google." }), {
          status: 404,
        });
      }
      if (path === SIGNUP_PHONE_CONFIRM_PATH) {
        return new Response(JSON.stringify({ phoneVerified: true }), { status: 200 });
      }
      if (path === PHONE_SIGN_IN_PATH || path === SIGNUP_PHONE_RESEND_PATH) {
        return new Response(JSON.stringify({ message: "Código enviado no WhatsApp." }), { status: 200 });
      }
      return new Response(JSON.stringify({ access_token: "jwt-novo" }), { status: 200 });
    },
  });
  return { calls, request };
}

function sent(call: { url: string; init: RequestInit | undefined }) {
  const headers = new Headers(call.init?.headers);
  return {
    url: call.url,
    method: call.init?.method,
    authorization: headers.get("authorization"),
    body: call.init?.body ? JSON.parse(String(call.init.body)) : undefined,
  };
}

describe("dialog de acesso", () => {
  it("abre pelo parâmetro e pelas rotas de entrada e cadastro", () => {
    expect(authDialogIsOpen("/mercado", "1")).toBe(true);
    expect(authDialogIsOpen("/entrar", null)).toBe(true);
    expect(authDialogIsOpen("/cadastrar/completar", null)).toBe(true);
    expect(authDialogIsOpen("/", null)).toBe(false);
  });
});

describe("entrada e Embedded Signup Google", () => {
  it("reconhece conta Google nova pela mensagem da API", () => {
    expect(isMissingGoogleAccount(404, "Conta não encontrada. Cadastre-se primeiro para usar o Google.")).toBe(true);
    expect(isMissingGoogleAccount(404, "Not Found")).toBe(false);
  });

  it("entra com e-mail e senha sem colocar o token na query", async () => {
    const { calls, request } = capture();
    const result = await signInWithEmail("jogador@exemplo.com", "segredo", request);
    expect(result).toEqual({ ok: true, accessToken: "jwt-novo" });
    const call = sent(calls[0]);
    expect(call.url).toBe(`http://api.test${EMAIL_SIGN_IN_PATH}`);
    expect(call.authorization).toBe(emailBasicAuthorization("jogador@exemplo.com", "segredo"));
    expect(call.url.includes("segredo")).toBe(false);
    expect(call.url.includes("jwt")).toBe(false);
  });

  it("pede e confirma o código do telefone", async () => {
    const { calls, request } = capture();
    expect(await requestPhoneSignIn("11999990000", request)).toEqual({
      ok: true,
      message: "Código enviado no WhatsApp.",
    });
    expect(await confirmPhoneSignIn("11999990000", "123456", request)).toEqual({
      ok: true,
      accessToken: "jwt-novo",
    });
    expect(sent(calls[0])).toMatchObject({
      url: `http://api.test${PHONE_SIGN_IN_PATH}`,
      method: "POST",
      body: { phone: "11999990000" },
    });
    expect(sent(calls[1])).toMatchObject({
      url: `http://api.test${PHONE_SIGN_IN_CONFIRM_PATH}`,
      body: { phone: "11999990000", code: "123456" },
    });
  });

  it("completa a conta nova e confirma o WhatsApp sem derrubar a sessão no 401 de login", async () => {
    const { calls, request } = capture();
    expect(await signInExistingGoogle("google-token", request)).toEqual({ status: "new-account" });
    expect(
      await completeGoogleSignup({ accessToken: "google-token", bornDate: "2008-11-24", phone: "11999990000" }, request),
    ).toEqual({ ok: true, accessToken: "jwt-novo" });
    expect(await confirmSignupPhoneCode({ accessToken: "jwt-novo", phone: "11999990000", code: "123456" }, request)).toEqual({
      ok: true,
      accessToken: null,
    });
    expect(await resendSignupPhoneCode({ accessToken: "jwt-novo", phone: "11999990000" }, request)).toEqual({
      ok: true,
      message: "Código enviado no WhatsApp.",
    });

    expect(sent(calls[0])).toMatchObject({
      url: `http://api.test${GOOGLE_SIGN_IN_PATH}`,
      authorization: "Bearer google-token",
      body: {},
    });
    expect(sent(calls[1])).toMatchObject({
      url: `http://api.test${GOOGLE_SIGNUP_PROFILE_PATH}`,
      authorization: "Bearer google-token",
      body: { bornDate: "2008-11-24", phone: "11999990000" },
    });
    expect(sent(calls[2])).toMatchObject({
      url: `http://api.test${SIGNUP_PHONE_CONFIRM_PATH}`,
      authorization: "Bearer jwt-novo",
      body: { phone: "11999990000", code: "123456" },
    });
    expect(sent(calls[3]).url).toBe(`http://api.test${SIGNUP_PHONE_RESEND_PATH}`);
    expect(calls.every((call) => !String(call.url).includes("token="))).toBe(true);
  });
});
