/**
 * Entrada por e-mail e senha. O array `phones` deixa de ser identificador.
 * Login só com telefone usa OTP (`IPhoneSignInRequest`), sem senha.
 */
export type ISignInRequest = {
  email: string;
  password: string;
};

/** POST /v2/signin/phone — WhatsApp já cadastrado. O número vai sem máscara, com DDD. */
export interface IPhoneSignInRequest {
  phone: string;
}

/** POST /v2/signin/phone/confirm */
export interface IPhoneSignInConfirm {
  phone: string;
  code: string;
}

/**
 * Embedded Signup Google, etapa da conta nova.
 * POST /v2/signup/google com o access token do Google.
 * `bornDate` é yyyy-mm-dd. `phone` é o WhatsApp com DDD, sem máscara.
 */
export interface IGoogleSignupProfile {
  bornDate: string;
  phone: string;
}
