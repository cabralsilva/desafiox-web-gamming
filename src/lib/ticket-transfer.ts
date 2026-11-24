import { apiRequest } from "@/lib/api";

export const OWNER_DECIDES_SALE = "Esta é uma proposta de compra. O dono do ticket decide se vende.";
export const DIRECT_SALE_CONFIRM_LABEL = "Confirmar compra";
export const PROPOSAL_CONFIRM_LABEL = "Fazer proposta";

export type TransferAvailableTeam = {
  id: string;
  name: string;
  shortName: string;
  position: number;
};

export type TicketTransferPreview = {
  id: string;
  code: string;
  points: number;
  marketValue: number | null;
  ownerNickName: string;
  saleAuthorized?: boolean;
  availableTeams: TransferAvailableTeam[];
};

export type TicketTransferProposalResult = {
  checkoutUrl: string;
  offline: boolean;
};

export type TransferPaymentChoice = "credits" | "checkout";

export type TransferProposalBlock = "requested" | "processing";

export async function loadTicketTransferPreview(ticketId: string, fallback: TicketTransferPreview): Promise<TicketTransferPreview> {
  try {
    const response = await apiRequest(`/ticket/${encodeURIComponent(ticketId)}/transfer-preview`, { auth: true });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(messageFromPayload(payload, `Erro ao carregar a proposta (${response.status}).`));
    }
    return transferPreviewFromPayload(payload);
  } catch (error) {
    if (missingApi(error)) return fallback;
    throw error;
  }
}

export function transferProposalBody(acceptedAt: string, paymentMethod?: TransferPaymentChoice) {
  return {
    acceptTermsOfChallenge: {
      accepted: true,
      acceptedAtDateTime: acceptedAt,
      acceptedAppVersion: "web-1.0.0",
    },
    ...(paymentMethod ? { paymentMethod: paymentMethod === "credits" ? "WALLET" : "CHECKOUT" } : {}),
  };
}

export function readPhoneVerified(payload: unknown): boolean | null {
  const record = unwrapRecord(payload);
  if (!record || typeof record.phoneVerified !== "boolean") return null;
  return record.phoneVerified;
}

export async function createTicketTransferProposal(
  ticketId: string,
  paymentMethod?: TransferPaymentChoice,
): Promise<TicketTransferProposalResult> {
  if (!process.env.NEXT_PUBLIC_API_URL) return { checkoutUrl: "", offline: true };
  const response = await apiRequest(`/ticket/${encodeURIComponent(ticketId)}/transfer-proposal`, {
    method: "POST",
    auth: true,
    body: transferProposalBody(new Date().toISOString(), paymentMethod),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, `Erro ao enviar a proposta (${response.status}).`));
  }
  return { checkoutUrl: checkoutUrlFromTransferPayload(payload), offline: false };
}

export function transferProposalBlockFromMessage(message: string): TransferProposalBlock | null {
  const text = message.toLocaleLowerCase("pt-BR");
  if (text.includes("proposta sua")) return "requested";
  if (text.includes("em processamento")) return "processing";
  return null;
}

export function transferPreviewFromPayload(payload: unknown): TicketTransferPreview {
  const record = unwrapRecord(payload) ?? {};
  const teams = Array.isArray(record.availableTeams) ? record.availableTeams : [];

  return {
    id: entityId(record._id ?? record.id),
    code: typeof record.code === "string" ? record.code.trim() : "",
    points: finiteNumber(record.points) ?? 0,
    marketValue: finiteNumber(record.marketValue),
    ownerNickName: typeof record.ownerNickName === "string" ? record.ownerNickName.trim() : "",
    saleAuthorized: typeof record.saleAuthorized === "boolean" ? record.saleAuthorized : undefined,
    availableTeams: teams.flatMap((team) => {
      if (!team || typeof team !== "object") return [];
      const row = team as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const shortName = typeof row.shortName === "string" ? row.shortName.trim() : "";
      const label = name || shortName;
      if (!label) return [];
      return [{
        id: entityId(row._id ?? row.id) || label,
        name: label,
        shortName,
        position: finiteNumber(row.position) ?? 0,
      }];
    }),
  };
}

export function checkoutUrlFromTransferPayload(payload: unknown): string {
  const record = unwrapRecord(payload);
  if (!record) return "";
  const candidates: Record<string, unknown>[] = [record];
  for (const key of ["ticketTransfer", "transfer"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      candidates.push(nested as Record<string, unknown>);
    }
  }
  for (const candidate of candidates) {
    const url = checkoutUrlFromRow(candidate);
    if (url) return url;
  }
  return "";
}

function checkoutUrlFromRow(row: Record<string, unknown>): string {
  if (typeof row.checkoutUrl === "string" && row.checkoutUrl.trim()) return row.checkoutUrl.trim();
  const infinitePay = row.infinitePay;
  if (!infinitePay || typeof infinitePay !== "object") return "";
  const url = (infinitePay as { checkoutUrl?: unknown }).checkoutUrl;
  return typeof url === "string" ? url.trim() : "";
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const first = message.find((item) => typeof item === "string" && item.trim());
    if (typeof first === "string") return first.trim();
  }
  return fallback;
}

function unwrapRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const root = payload as Record<string, unknown>;
  for (const key of ["data", "result", "payload"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
  }
  return root;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function entityId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return typeof id === "string" ? id.trim() : "";
  }
  return "";
}

function missingApi(error: unknown) {
  return error instanceof Error && error.message.includes("NEXT_PUBLIC_API_URL");
}
