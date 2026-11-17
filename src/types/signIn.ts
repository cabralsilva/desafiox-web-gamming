/**
 * Entrada por e-mail ou pelo WhatsApp único (`phone`). API-06.
 * O array `phones` deixa de ser identificador.
 */
export type ISignInRequest =
  | { email: string; password: string; phone?: never }
  | { phone: string; password: string; email?: never };
