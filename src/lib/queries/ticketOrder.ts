export type TicketPaymentMethod = "credits" | "checkout";

const PAYMENT_API: Record<TicketPaymentMethod, "WALLET" | "CHECKOUT"> = {
  credits: "WALLET",
  checkout: "CHECKOUT",
};

export type TicketOrderInput = {
  signedIn: boolean;
  accountId: string;
  challengeId: string;
  amount: number;
  unitValue: number;
  paymentMethod: TicketPaymentMethod;
  acceptedAt: string;
};

export type TicketOrderResult =
  | { ok: false; reason: "guest" | "busy" | "error"; message?: string }
  | { ok: true; orderId: string | null; checkoutUrl: string | null; status: string | null };

export function canConfirmPurchase(signedIn: boolean) {
  return signedIn;
}

export function ticketOrderFromWalletPath() {
  return "/ticket-order/from-wallet";
}

export function ticketOrderFromCheckoutPath() {
  return "/ticket-order/from-checkout";
}

export function ticketOrderByIdPath(orderId: string) {
  return `/ticket-order/${encodeURIComponent(orderId)}`;
}

export function buildTicketOrderBody(input: TicketOrderInput) {
  return {
    account: input.accountId,
    challenge: input.challengeId,
    amount: input.amount,
    unitValue: input.unitValue,
    paymentMethod: PAYMENT_API[input.paymentMethod],
    coupons: [] as string[],
    acceptTermsOfChallenge: {
      accepted: true,
      acceptedAtDateTime: input.acceptedAt,
      acceptedAppVersion: "web",
      contentAccepted: "",
    },
  };
}

export function createSubmitGuard() {
  let pending = false;
  return {
    tryStart() {
      if (pending) return false;
      pending = true;
      return true;
    },
    finish() {
      pending = false;
    },
  };
}

export function readOrderId(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;
  const id = record._id ?? record.id;
  if (typeof id === "string" && id) return id;
  if (id && typeof id === "object" && "$oid" in id) {
    const oid = (id as { $oid?: unknown }).$oid;
    return typeof oid === "string" && oid ? oid : null;
  }
  return null;
}

export function readCheckoutUrl(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;
  if (typeof record.checkoutUrl === "string" && record.checkoutUrl) return record.checkoutUrl;
  const infinitePay = asRecord(record.infinitePay);
  if (typeof infinitePay?.checkoutUrl === "string" && infinitePay.checkoutUrl) return infinitePay.checkoutUrl;
  return null;
}

export function readOrderStatus(data: unknown): "DRAFT" | "PENDING" | "PAID" | "CANCELLED" | null {
  const record = asRecord(data);
  const status = record?.status;
  if (status === "DRAFT" || status === "PENDING" || status === "PAID" || status === "CANCELLED") return status;
  return null;
}

export async function submitTicketOrder(
  guard: ReturnType<typeof createSubmitGuard>,
  input: TicketOrderInput,
  request: (path: string, body: ReturnType<typeof buildTicketOrderBody>) => Promise<Response>,
): Promise<TicketOrderResult> {
  if (!canConfirmPurchase(input.signedIn)) return { ok: false, reason: "guest" };
  if (!guard.tryStart()) return { ok: false, reason: "busy" };
  const path = input.paymentMethod === "credits" ? ticketOrderFromWalletPath() : ticketOrderFromCheckoutPath();
  try {
    const response = await request(path, buildTicketOrderBody(input));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, reason: "error", message: readMessage(data, response.status) };
    }
    return {
      ok: true,
      orderId: readOrderId(data),
      checkoutUrl: readCheckoutUrl(data),
      status: readOrderStatus(data),
    };
  } catch {
    return { ok: false, reason: "error", message: "Não foi possível concluir a compra." };
  } finally {
    guard.finish();
  }
}

function readMessage(data: unknown, status: number) {
  const record = asRecord(data);
  return typeof record?.message === "string" && record.message
    ? record.message
    : `Não foi possível concluir a compra (${status}).`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
