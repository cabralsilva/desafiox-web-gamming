import { clearAuthSession, getAuthToken } from "@/lib/session";

export type ApiRequestOptions = {
  method?: string;
  auth?: boolean;
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export type ApiClientDeps = {
  fetchFn: typeof fetch;
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
};

export function createApiClient(deps: ApiClientDeps) {
  const baseUrl = deps.baseUrl.replace(/\/$/, "");

  return async function request(path: string, options: ApiRequestOptions = {}) {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (options.auth && !headers.has("Authorization")) {
      const token = deps.getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await deps.fetchFn.call(globalThis, `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (options.auth && response.status === 401) {
      deps.onUnauthorized();
    }

    return response;
  };
}

function defaultDeps(): ApiClientDeps {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL não configurada.");
  }
  return {
    fetchFn: fetch,
    baseUrl,
    getToken: getAuthToken,
    onUnauthorized: clearAuthSession,
  };
}

export async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  return createApiClient(defaultDeps())(path, options);
}
