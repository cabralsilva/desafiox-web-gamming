import type { IPhoneSignInConfirm, IPhoneSignInRequest, ISignInRequest } from "../types";

/** Entrada por e-mail e senha. */
export const signInByEmail: ISignInRequest = {
  email: "jogador@exemplo.com",
  password: "senha-exemplo",
};

/** OTP de WhatsApp. O número de exemplo segue o contrato sem DDI. */
export const signInByPhone: IPhoneSignInRequest = {
  phone: "11999990000",
};

export const signInByPhoneConfirm: IPhoneSignInConfirm = {
  phone: signInByPhone.phone,
  code: "000000",
};
