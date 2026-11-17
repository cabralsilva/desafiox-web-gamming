const TOKEN_KEY = "desafiox_web_token";
const SESSION_EVENT = "desafiox-session";

export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readToken(store: KeyValueStore): string | null {
  const token = store.getItem(TOKEN_KEY);
  return token && token.length > 0 ? token : null;
}

export function writeToken(store: KeyValueStore, token: string) {
  store.setItem(TOKEN_KEY, token);
}

export function deleteToken(store: KeyValueStore) {
  store.removeItem(TOKEN_KEY);
}

function browserStore(): KeyValueStore | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getAuthToken(): string | null {
  const store = browserStore();
  return store ? readToken(store) : null;
}

export function setAuthSession(token: string) {
  const store = browserStore();
  if (!store) return;
  writeToken(store, token);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearAuthSession() {
  const store = browserStore();
  if (!store) return;
  deleteToken(store);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeSession(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
