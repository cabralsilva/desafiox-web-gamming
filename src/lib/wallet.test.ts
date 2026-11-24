import { describe, expect, it } from "vitest";
import { walletMockAccount, walletMovementCatalog } from "@/mocks/wallet";
import {
  canConfirmWallet,
  formatCurrencyInput,
  isReceiptFile,
  latestCompletedBalance,
  manualDepositPayload,
  movementStatusLabel,
  movementTypeView,
  parseCurrencyInput,
  readWalletAccount,
  readWalletMovements,
  RECEIPT_MAX_BYTES,
  walletAccountPath,
  walletStatementPath,
  withdrawPayload,
} from "@/lib/wallet";

describe("extrato da carteira", () => {
  it("pede só os campos do extrato, sem dados da conta", () => {
    const params = new URL(`http://api.test${walletStatementPath()}`).searchParams;
    expect(params.get("orderBy")).toBe("createdAtDateTime");
    expect(params.get("orderSense")).toBe("desc");
    expect(params.get("populate")).toBe("");
    const select = params.get("select") ?? "";
    expect(select).toContain("typeMovement");
    expect(select).toContain("valueMovemented");
    expect(select).toContain("status");
    expect(select).toContain("createdAtDateTime");
    expect(select).not.toMatch(/email|password|phone|pixKey|socialId|pagarme/i);
    expect(walletAccountPath("conta 1")).toBe("/account/conta%201?select=pixKey,phoneVerified");
  });

  it("lê tipo, valor, status e data e ignora o restante da conta", () => {
    const items = readWalletMovements({
      items: [
        {
          _id: "antigo",
          description: "Depósito",
          valueMovemented: "10,5",
          typeMovement: "deposit",
          status: "COMPLETED",
          createdAtDateTime: "2026-11-01T12:00:00.000Z",
          balanceAfter: 10.5,
          account: { email: "pessoa@example.com", pixKey: "segredo" },
        },
        {
          _id: "novo",
          description: "Venda",
          valueMovemented: 20,
          typeMovement: "SALE_TICKET",
          status: "PENDING",
          createdAtDateTime: "2026-11-02T12:00:00.000Z",
        },
        { _id: "invalido", typeMovement: "PIX", status: "COMPLETED", valueMovemented: 1 },
      ],
    });
    expect(items.map((item) => item.id)).toEqual(["novo", "antigo"]);
    expect(items[1]).toMatchObject({ valueMovemented: 10.5, typeMovement: "DEPOSIT", status: "COMPLETED", manual: false });
    expect(items[1]).not.toHaveProperty("account");
    expect(movementTypeView("SALE_TICKET").label).toBe("Venda");
    expect(movementTypeView("BUY_TICKET")).toEqual({ label: "Compra", incoming: false });
    expect(movementTypeView("AWARD").label).toBe("Premiação");
    expect(movementTypeView("WITHDRAW").incoming).toBe(false);
    expect(movementStatusLabel("PENDING")).toBe("Pendente");
    expect(movementStatusLabel("CANCELLED")).toBe("Cancelado");
    expect(movementStatusLabel("COMPLETED")).toBe("Concluído");
    expect(latestCompletedBalance(walletMovementCatalog)).toBe(120);
    expect(walletMockAccount.pixKey).toBeNull();
  });
});

describe("depósito manual e saque", () => {
  it("monta depósito pendente com comprovante e sem cobrança automática", () => {
    const files = [{ description: "pix.pdf", contentType: "application/pdf", fileBase64: "YQ==" }];
    const body = manualDepositPayload(25, files);
    expect(body).toEqual({
      description: "Deposito PIX (Manual D+1)",
      typeMovement: "DEPOSIT",
      manual: true,
      valueMovemented: 25,
      files,
    });
    expect(JSON.stringify(body)).not.toMatch(/qr|pagarme|automatic/i);
    expect(withdrawPayload(40, "pessoa@pix")).toEqual({
      description: "Solicitação de saque para chave pix pessoa@pix",
      typeMovement: "WITHDRAW",
      valueMovemented: 40,
      files: [],
    });
  });

  it("lê o valor digitado em centavos e limita o comprovante", () => {
    expect(parseCurrencyInput("")).toBe(0);
    expect(parseCurrencyInput("R$ 10,50")).toBe(10.5);
    expect(formatCurrencyInput("1050")).toContain("10,50");
    expect(isReceiptFile({ type: "image/png", size: 100 })).toBe(true);
    expect(isReceiptFile({ type: "application/pdf", size: RECEIPT_MAX_BYTES })).toBe(true);
    expect(isReceiptFile({ type: "text/plain", size: 100 })).toBe(false);
    expect(isReceiptFile({ type: "image/png", size: RECEIPT_MAX_BYTES + 1 })).toBe(false);
  });

  it("confirma só com sessão e WhatsApp que não esteja pendente", () => {
    expect(canConfirmWallet(false, true)).toBe(false);
    expect(canConfirmWallet(true, false)).toBe(false);
    expect(canConfirmWallet(true, null)).toBe(true);
    expect(readWalletAccount({ data: { pixKey: "  chave  ", phoneVerified: false } })).toEqual({
      pixKey: "chave",
      phoneVerified: false,
    });
  });
});
