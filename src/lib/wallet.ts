import { apiRequest } from "@/lib/api";
import { formatMoneyBR } from "@/lib/money";

/** Depósito desta versão é só o manual do app. Não gera QR Code de Pix. */
export const COMPANY_PIX_KEY = "47.809.123/0001-31";
export const COMPANY_PIX_HOLDER = "C2 Consultoria e Gestão empresarial";

export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;

export const WALLET_MOVEMENT_SELECT = [
  "description",
  "valueMovemented",
  "typeMovement",
  "status",
  "createdAtDateTime",
  "manual",
  "balanceAfter",
].join(",");

export type WalletMovementType = "DEPOSIT" | "WITHDRAW" | "BUY_TICKET" | "SALE_TICKET" | "AWARD";
export type WalletMovementStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type WalletFileInput = {
  description: string;
  contentType: string;
  fileBase64: string;
};

export type WalletMovement = {
  id: string;
  description: string;
  valueMovemented: number;
  typeMovement: WalletMovementType;
  status: WalletMovementStatus;
  createdAtDateTime: string | null;
  manual: boolean;
  balanceAfter: number | null;
};

export type WalletAccount = {
  pixKey: string | null;
  phoneVerified: boolean | null;
};

const MOVEMENT_TYPES = new Set<WalletMovementType>(["DEPOSIT", "WITHDRAW", "BUY_TICKET", "SALE_TICKET", "AWARD"]);
const MOVEMENT_STATUSES = new Set<WalletMovementStatus>(["PENDING", "COMPLETED", "CANCELLED"]);

export function walletStatementPath() {
  const params = new URLSearchParams({
    orderBy: "createdAtDateTime",
    orderSense: "desc",
    limit: "100",
    select: WALLET_MOVEMENT_SELECT,
    populate: "",
  });
  return `/wallet-moviment?${params.toString()}`;
}

export function walletAccountPath(accountId: string) {
  return `/account/${encodeURIComponent(accountId)}?select=pixKey,phoneVerified`;
}

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return formatMoneyBR(Number(digits) / 100);
}

export function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function isReceiptFile(file: { type: string; size: number }) {
  const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
  return allowed && file.size > 0 && file.size <= RECEIPT_MAX_BYTES;
}

export function movementTypeView(type: WalletMovementType) {
  if (type === "WITHDRAW") return { label: "Saque", incoming: false };
  if (type === "BUY_TICKET") return { label: "Compra", incoming: false };
  if (type === "SALE_TICKET") return { label: "Venda", incoming: true };
  if (type === "AWARD") return { label: "Premiação", incoming: true };
  return { label: "Depósito", incoming: true };
}

export function movementStatusLabel(status: WalletMovementStatus) {
  if (status === "PENDING") return "Pendente";
  if (status === "CANCELLED") return "Cancelado";
  return "Concluído";
}

export function formatMovementDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function latestCompletedBalance(items: WalletMovement[]) {
  const completed = items.find((item) => item.status === "COMPLETED" && item.balanceAfter != null);
  return completed?.balanceAfter ?? null;
}

export function canConfirmWallet(signedIn: boolean, phoneVerified: boolean | null) {
  return signedIn && phoneVerified !== false;
}

export function manualDepositPayload(valueMovemented: number, files: WalletFileInput[]) {
  return {
    description: "Deposito PIX (Manual D+1)",
    typeMovement: "DEPOSIT" as const,
    manual: true,
    valueMovemented,
    files,
  };
}

export function withdrawPayload(valueMovemented: number, pixKey: string) {
  return {
    description: `Solicitação de saque para chave pix ${pixKey}`,
    typeMovement: "WITHDRAW" as const,
    valueMovemented,
    files: [] as WalletFileInput[],
  };
}

export function readWalletAccount(payload: unknown): WalletAccount {
  const record = unwrapRecord(payload);
  const pixKey = typeof record?.pixKey === "string" ? record.pixKey.trim() : "";
  return {
    pixKey: pixKey || null,
    phoneVerified: typeof record?.phoneVerified === "boolean" ? record.phoneVerified : null,
  };
}

export function readWalletMovements(payload: unknown): WalletMovement[] {
  return pickArray(payload)
    .flatMap((row) => {
      const item = readWalletMovement(row);
      return item ? [item] : [];
    })
    .sort((left, right) => movementTime(right) - movementTime(left));
}

export function readWalletMovement(payload: unknown): WalletMovement | null {
  const record = unwrapRecord(payload);
  if (!record) return null;
  const typeMovement = text(record.typeMovement).toUpperCase() as WalletMovementType;
  const status = text(record.status).toUpperCase() as WalletMovementStatus;
  const valueMovemented = finiteNumber(record.valueMovemented);
  if (!MOVEMENT_TYPES.has(typeMovement) || !MOVEMENT_STATUSES.has(status) || valueMovemented == null) return null;
  const id = text(record._id) || text(record.id);
  return {
    id: id || `${typeMovement}-${valueMovemented}`,
    description: text(record.description) || "Movimentação de carteira",
    valueMovemented,
    typeMovement,
    status,
    createdAtDateTime: text(record.createdAtDateTime) || null,
    manual: record.manual === true,
    balanceAfter: finiteNumber(record.balanceAfter),
  };
}

export async function loadWalletStatement(): Promise<WalletMovement[]> {
  const response = await apiRequest(walletStatementPath(), { auth: true });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(payload, "Não foi possível carregar o extrato."));
  return readWalletMovements(payload);
}

export async function loadWalletAccount(accountId: string): Promise<WalletAccount> {
  const response = await apiRequest(walletAccountPath(accountId), { auth: true });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(payload, "Não foi possível carregar a chave Pix."));
  return readWalletAccount(payload);
}

export async function savePixKey(accountId: string, pixKey: string): Promise<string> {
  const key = pixKey.trim();
  if (!key) throw new Error("Informe a chave Pix.");
  if (!process.env.NEXT_PUBLIC_API_URL) return key;
  const response = await apiRequest(`/account/${encodeURIComponent(accountId)}`, {
    method: "PATCH",
    auth: true,
    body: { pixKey: key },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(payload, "Não foi possível salvar a chave Pix."));
  return readWalletAccount(payload).pixKey || key;
}

export async function createManualDeposit(valueMovemented: number, files: WalletFileInput[]): Promise<WalletMovement> {
  const body = manualDepositPayload(valueMovemented, files);
  if (!process.env.NEXT_PUBLIC_API_URL) return pendingFrom(body);
  const response = await apiRequest("/wallet-moviment", { method: "POST", auth: true, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(payload, "Não foi possível registrar o depósito."));
  return readWalletMovement(payload) ?? pendingFrom(body);
}

export async function createWithdraw(valueMovemented: number, pixKey: string): Promise<WalletMovement> {
  const body = withdrawPayload(valueMovemented, pixKey);
  if (!process.env.NEXT_PUBLIC_API_URL) return pendingFrom(body);
  const response = await apiRequest("/wallet-moviment", { method: "POST", auth: true, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(payload, "Não foi possível solicitar o saque."));
  return readWalletMovement(payload) ?? pendingFrom(body);
}

function pendingFrom(body: { description: string; typeMovement: WalletMovementType; valueMovemented: number; manual?: boolean }): WalletMovement {
  return {
    id: `local-${body.typeMovement}-${body.valueMovemented}`,
    description: body.description,
    valueMovemented: body.valueMovemented,
    typeMovement: body.typeMovement,
    status: "PENDING",
    createdAtDateTime: new Date().toISOString(),
    manual: body.manual === true,
    balanceAfter: null,
  };
}

function movementTime(item: WalletMovement) {
  const time = item.createdAtDateTime ? Date.parse(item.createdAtDateTime) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of ["items", "docs", "data", "results"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function unwrapRecord(payload: unknown): Record<string, unknown> | null {
  const record = asRecord(payload);
  if (!record) return null;
  if ("typeMovement" in record || "pixKey" in record || "phoneVerified" in record) return record;
  for (const key of ["data", "item", "account"]) {
    const nested = asRecord(record[key]);
    if (nested) return nested;
  }
  return record;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function messageFrom(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const message = record && typeof record.message === "string" ? record.message.trim() : "";
  return message || fallback;
}
