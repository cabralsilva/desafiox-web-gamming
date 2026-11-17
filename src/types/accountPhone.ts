import type { IAccount } from "c2-desafiox";

/**
 * WhatsApp único da conta. Substitui `phones[]`, que a API vai descontinuar.
 * A lib ainda publica o array; este tipo é o contrato da web até a lib acompanhar.
 */
export interface IAccountPhone {
  phone: string;
  phoneVerified: boolean;
}

export type IWebAccount = Omit<
  IAccount,
  "phones" | "passwordAccess" | "salt" | "tokenConfirmChecking"
> &
  IAccountPhone;
