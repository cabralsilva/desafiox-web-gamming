/** Envio e confirmação do código de WhatsApp. API-07. A lib não modela esse fluxo. */
export interface IWhatsAppCodeRequest {
  phone: string;
}

export interface IWhatsAppCodeConfirm {
  phone: string;
  code: string;
}

export interface IWhatsAppVerification {
  phone: string;
  phoneVerified: boolean;
}
