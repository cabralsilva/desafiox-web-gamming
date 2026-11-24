import type { ApiRequestOptions } from "@/lib/api";
import { apiRequest } from "@/lib/api";

/** Entrada de conta que já existe. Não cria cadastro. */
export const GOOGLE_SIGN_IN_PATH = "/v2/signin/google";

/**
 * Embedded Signup Google — etapa da conta nova.
 * Grava data de nascimento e WhatsApp, envia o código e devolve access_token.
 */
export const GOOGLE_SIGNUP_PROFILE_PATH = "/v2/signup/google";

/** Valida o código de 6 dígitos enviado depois do cadastro Google. */
export const SIGNUP_PHONE_CONFIRM_PATH = "/v2/signup/phone/confirm";

/** Reenvia o código de WhatsApp do cadastro Google. */
export const SIGNUP_PHONE_RESEND_PATH = "/v2/signup/phone/resend";

export const EMAIL_SIGN_IN_PATH = "/signin";
export const PHONE_SIGN_IN_PATH = "/v2/signin/phone";
export const PHONE_SIGN_IN_CONFIRM_PATH = "/v2/signin/phone/confirm";

export type AuthRequest = (path: string, options?: ApiRequestOptions) => Promise<Response>;

export function isAuthRoute(pathname: string): boolean {
  return pathname === "/entrar" || pathname === "/cadastrar" || pathname.startsWith("/cadastrar/");
}

export function authDialogIsOpen(pathname: string, acesso: string | null): boolean {
  return acesso === "1" || isAuthRoute(pathname);
}

export function emailBasicAuthorization(email: string, password: string): string {
  return `Basic ${btoa(`${email.trim()}:${password}`)}`;
}

type ApiPayload = {
  message: string;
  accessToken: string | null;
};

export async function readAuthPayload(response: Response): Promise<ApiPayload> {
  const data = (await response.json().catch(() => null)) as { message?: unknown; access_token?: unknown } | null;
  return {
    message: typeof data?.message === "string" ? data.message : "",
    accessToken: typeof data?.access_token === "string" && data.access_token ? data.access_token : null,
  };
}

export function isMissingGoogleAccount(status: number, message: string): boolean {
  if (status !== 404) return false;
  const text = message.toLowerCase();
  return text.includes("conta não encontrada") || text.includes("cadastre-se");
}

export type SessionResult = { ok: true; accessToken: string } | { ok: false; message: string };

export type GoogleProbeResult = { status: "session"; accessToken: string } | { status: "new-account" } | { status: "error"; message: string };

export type ConfirmCodeResult = { ok: true; accessToken: string | null } | { ok: false; message: string };

export type NoticeResult = { ok: true; message: string } | { ok: false; message: string };

function failure(message: string, fallback: string): { ok: false; message: string } {
  return { ok: false, message: message || fallback };
}

export async function signInWithEmail(email: string, password: string, request: AuthRequest = apiRequest): Promise<SessionResult> {
  const response = await request(EMAIL_SIGN_IN_PATH, {
    method: "POST",
    auth: false,
    headers: { Authorization: emailBasicAuthorization(email, password) },
  });
  const payload = await readAuthPayload(response);
  if (!response.ok || !payload.accessToken) {
    return failure(payload.message, "Falha no login.");
  }
  return { ok: true, accessToken: payload.accessToken };
}

export async function requestPhoneSignIn(phone: string, request: AuthRequest = apiRequest): Promise<NoticeResult> {
  const response = await request(PHONE_SIGN_IN_PATH, {
    method: "POST",
    auth: false,
    body: { phone },
  });
  const payload = await readAuthPayload(response);
  if (!response.ok) return failure(payload.message, "Não foi possível enviar o código.");
  return { ok: true, message: payload.message || "Código enviado no WhatsApp." };
}

export async function confirmPhoneSignIn(phone: string, code: string, request: AuthRequest = apiRequest): Promise<SessionResult> {
  const response = await request(PHONE_SIGN_IN_CONFIRM_PATH, {
    method: "POST",
    auth: false,
    body: { phone, code },
  });
  const payload = await readAuthPayload(response);
  if (!response.ok || !payload.accessToken) {
    return failure(payload.message, "Código inválido.");
  }
  return { ok: true, accessToken: payload.accessToken };
}

export async function signInExistingGoogle(accessToken: string, request: AuthRequest = apiRequest): Promise<GoogleProbeResult> {
  const response = await request(GOOGLE_SIGN_IN_PATH, {
    method: "POST",
    auth: false,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {},
  });
  const payload = await readAuthPayload(response);
  if (isMissingGoogleAccount(response.status, payload.message)) return { status: "new-account" };
  if (!response.ok || !payload.accessToken) {
    return { status: "error", message: payload.message || "Falha ao autenticar com Google." };
  }
  return { status: "session", accessToken: payload.accessToken };
}

export async function completeGoogleSignup(
  input: { accessToken: string; bornDate: string; phone: string },
  request: AuthRequest = apiRequest,
): Promise<SessionResult> {
  const response = await request(GOOGLE_SIGNUP_PROFILE_PATH, {
    method: "POST",
    auth: false,
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: { bornDate: input.bornDate, phone: input.phone },
  });
  const payload = await readAuthPayload(response);
  if (!response.ok || !payload.accessToken) {
    return failure(payload.message, "Não foi possível concluir o cadastro.");
  }
  return { ok: true, accessToken: payload.accessToken };
}

export async function confirmSignupPhoneCode(
  input: { accessToken: string; phone: string; code: string },
  request: AuthRequest = apiRequest,
): Promise<ConfirmCodeResult> {
  const response = await request(SIGNUP_PHONE_CONFIRM_PATH, {
    method: "POST",
    auth: false,
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: { phone: input.phone, code: input.code },
  });
  const payload = await readAuthPayload(response);
  if (!response.ok) return failure(payload.message, "Código inválido.");
  return { ok: true, accessToken: payload.accessToken };
}

export async function resendSignupPhoneCode(
  input: { accessToken: string; phone: string },
  request: AuthRequest = apiRequest,
): Promise<NoticeResult> {
  const response = await request(SIGNUP_PHONE_RESEND_PATH, {
    method: "POST",
    auth: false,
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: { phone: input.phone },
  });
  const payload = await readAuthPayload(response);
  if (!response.ok) return failure(payload.message, "Não foi possível reenviar o código.");
  return { ok: true, message: payload.message || "Código reenviado no WhatsApp." };
}
