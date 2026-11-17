import type { ISignInRequest } from "../types";

/** API-06. O endpoint atual só autentica e-mail; o telefone único ainda não entra. */
export const signInByEmail: ISignInRequest = {
  email: "jogador@exemplo.com",
  password: "senha-exemplo",
};

export const signInByPhone: ISignInRequest = {
  phone: "5511999990000",
  password: "senha-exemplo",
};
