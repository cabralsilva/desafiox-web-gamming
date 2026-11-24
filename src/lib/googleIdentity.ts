const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

type TokenResponse = {
  access_token?: string;
  error?: string;
};

type TokenClient = {
  requestAccessToken: () => void;
};

type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }) => TokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let loading: Promise<void> | null = null;

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Não foi possível autenticar com Google."));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    const script = existing ?? document.createElement("script");
    script.async = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Não foi possível carregar o Google."));
    };
    if (!existing) {
      script.src = GOOGLE_SCRIPT;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.oauth2) {
      resolve();
    }
  });
  return loading;
}

export async function requestGoogleAccessToken(clientId: string, scope: string): Promise<string> {
  await loadGoogleIdentityScript();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) throw new Error("Não foi possível autenticar com Google.");
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (!response.access_token || response.error) {
          reject(new Error("Não foi possível autenticar com Google."));
          return;
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken();
  });
}
