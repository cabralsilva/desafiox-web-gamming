import type { IWhatsAppCodeConfirm, IWhatsAppCodeRequest, IWhatsAppVerification } from "../types";

/** API-07. Corpo para pedir o código. */
export const whatsAppCodeRequest: IWhatsAppCodeRequest = {
  phone: "5511999990000",
};

/** API-07. Confirmação imediata. O código é fictício. */
export const whatsAppCodeConfirm: IWhatsAppCodeConfirm = {
  phone: whatsAppCodeRequest.phone,
  code: "000000",
};

/** API-07. A pessoa seguiu sem digitar o código. */
export const whatsAppPending: IWhatsAppVerification = {
  phone: whatsAppCodeRequest.phone,
  phoneVerified: false,
};

export const whatsAppVerified: IWhatsAppVerification = {
  phone: whatsAppCodeRequest.phone,
  phoneVerified: true,
};
