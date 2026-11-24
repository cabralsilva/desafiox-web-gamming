import type { WalletAccount, WalletMovement } from "@/lib/wallet";

/** Extrato local, do mais recente para o mais antigo. A chave Pix começa vazia para o cadastro no diálogo. */
export const walletMovementCatalog: WalletMovement[] = [
  {
    id: "mov-award",
    description: "Premiação do Brasileirão sobrevivência",
    valueMovemented: 80,
    typeMovement: "AWARD",
    status: "PENDING",
    createdAtDateTime: "2026-11-24T11:00:00.000Z",
    manual: false,
    balanceAfter: null,
  },
  {
    id: "mov-buy",
    description: "Compra de inscrição",
    valueMovemented: 50,
    typeMovement: "BUY_TICKET",
    status: "COMPLETED",
    createdAtDateTime: "2026-11-20T15:00:00.000Z",
    manual: false,
    balanceAfter: 120,
  },
  {
    id: "mov-sale",
    description: "Venda do ticket BX-1042",
    valueMovemented: 90,
    typeMovement: "SALE_TICKET",
    status: "COMPLETED",
    createdAtDateTime: "2026-11-18T12:00:00.000Z",
    manual: false,
    balanceAfter: 170,
  },
  {
    id: "mov-withdraw",
    description: "Solicitação de saque",
    valueMovemented: 30,
    typeMovement: "WITHDRAW",
    status: "CANCELLED",
    createdAtDateTime: "2026-11-12T10:00:00.000Z",
    manual: false,
    balanceAfter: null,
  },
  {
    id: "mov-deposit",
    description: "Deposito PIX (Manual D+1)",
    valueMovemented: 200,
    typeMovement: "DEPOSIT",
    status: "COMPLETED",
    createdAtDateTime: "2026-11-10T10:00:00.000Z",
    manual: true,
    balanceAfter: 200,
  },
];

export const walletMockAccount: WalletAccount = {
  pixKey: null,
  phoneVerified: null,
};
