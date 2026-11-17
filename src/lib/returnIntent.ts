const INTENT_KEY = "desafiox_web_return";

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ReturnIntent = {
  pathname: string;
  search: string;
  dialog: string | null;
};

function isSafePathname(pathname: string) {
  return pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("://") && !pathname.includes("\\");
}

function isSafeSearch(search: string) {
  return search === "" || (search.startsWith("?") && !search.includes("://"));
}

export function saveReturnIntent(intent: ReturnIntent, store: KeyValueStore = sessionStorage) {
  if (!isSafePathname(intent.pathname) || !isSafeSearch(intent.search)) return;
  store.setItem(INTENT_KEY, JSON.stringify(intent));
}

export function peekReturnIntent(store: KeyValueStore = sessionStorage): ReturnIntent | null {
  const raw = store.getItem(INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReturnIntent>;
    if (typeof parsed.pathname !== "string" || typeof parsed.search !== "string") return null;
    if (!isSafePathname(parsed.pathname) || !isSafeSearch(parsed.search)) return null;
    return {
      pathname: parsed.pathname,
      search: parsed.search,
      dialog: typeof parsed.dialog === "string" ? parsed.dialog : null,
    };
  } catch {
    return null;
  }
}

export function consumeReturnIntent(store: KeyValueStore = sessionStorage): ReturnIntent | null {
  const intent = peekReturnIntent(store);
  if (intent) store.removeItem(INTENT_KEY);
  return intent;
}

export function rememberCurrentIntent(dialog?: string | null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  saveReturnIntent({
    pathname: window.location.pathname,
    search: window.location.search,
    dialog: dialog ?? params.get("dialog"),
  });
}
