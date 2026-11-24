"use client";

import { Suspense, useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthDialogProvider } from "@/components/auth-dialog-context";
import { CloseIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  authDialogIsOpen,
  completeGoogleSignup,
  confirmPhoneSignIn,
  confirmSignupPhoneCode,
  isAuthRoute,
  requestPhoneSignIn,
  resendSignupPhoneCode,
  signInExistingGoogle,
  signInWithEmail,
} from "@/lib/auth";
import { assertAdultBirthDateBR, maskBirthDateInput } from "@/lib/birthDate";
import { fetchGoogleAccountHints, GOOGLE_EMBEDDED_SIGNUP_SCOPE } from "@/lib/googleProfile";
import { getGoogleClientId, requestGoogleAccessToken } from "@/lib/googleIdentity";
import { maskPhoneInput, nationalPhoneDigits } from "@/lib/phone";
import { setAuthSession } from "@/lib/session";

const fieldClass =
  "h-11 w-full rounded-md border border-border bg-secondary px-3 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

type Step = "home" | "email" | "phone" | "phone-code" | "google-profile" | "whatsapp-code";

export function AuthDialogHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const openAuth = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("acesso") === "1" || isAuthRoute(url.pathname)) return;
    url.searchParams.set("acesso", "1");
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  }, [router]);

  return (
    <AuthDialogProvider openAuth={openAuth}>
      {children}
      <Suspense fallback={null}>
        <AuthDialog />
      </Suspense>
    </AuthDialogProvider>
  );
}

function AuthDialog() {
  const pathname = usePathname();
  const params = useSearchParams();
  if (!authDialogIsOpen(pathname, params.get("acesso"))) return null;
  return <AuthDialogPanel />;
}

function AuthDialogPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const googleConfigured = Boolean(getGoogleClientId());
  const [step, setStep] = useState<Step>("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function dismiss() {
    if (isAuthRoute(pathname)) {
      router.replace("/");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("acesso");
    const query = url.searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function finishSession(token: string) {
    setAuthSession(token);
    dismiss();
  }

  function requestClose() {
    if (step === "whatsapp-code" && pendingToken) setAuthSession(pendingToken);
    dismiss();
  }

  function goHome() {
    setError(null);
    setNotice(null);
    setStep("home");
  }

  async function continueWithGoogle() {
    const clientId = getGoogleClientId();
    if (!clientId || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const accessToken = await requestGoogleAccessToken(clientId, GOOGLE_EMBEDDED_SIGNUP_SCOPE);
      const hints = await fetchGoogleAccountHints(accessToken);
      const result = await signInExistingGoogle(accessToken);
      if (result.status === "session") {
        finishSession(result.accessToken);
        return;
      }
      if (result.status === "new-account") {
        setGoogleToken(accessToken);
        setBirthDate(hints.birthDateBR);
        setPhone(hints.phone);
        setStep("google-profile");
        return;
      }
      setError(result.message);
    } catch (cause) {
      setError(userMessage(cause, "Não foi possível autenticar com Google."));
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      finishSession(result.accessToken);
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  async function submitPhone(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const national = nationalPhoneDigits(phone);
    if (!national) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await requestPhoneSignIn(national);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPhone(maskPhoneInput(national));
      setCode("");
      setNotice("Enviamos um código de 6 dígitos no WhatsApp. Ele vale 5 minutos.");
      setStep("phone-code");
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  async function submitPhoneCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const national = nationalPhoneDigits(phone);
    if (!national || !/^\d{6}$/.test(code)) {
      setError("Informe o código de 6 dígitos.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await confirmPhoneSignIn(national, code);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      finishSession(result.accessToken);
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  async function resendPhoneCode() {
    if (busy) return;
    const national = nationalPhoneDigits(phone);
    if (!national) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requestPhoneSignIn(national);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogleProfile(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!googleToken) {
      setError("Refaça o Continuar com Google.");
      return;
    }
    const birth = assertAdultBirthDateBR(birthDate);
    if (!birth.ok) {
      setError(birth.message);
      return;
    }
    const national = nationalPhoneDigits(phone);
    if (!national) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await completeGoogleSignup({ accessToken: googleToken, bornDate: birth.isoDate, phone: national });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPendingToken(result.accessToken);
      setPhone(maskPhoneInput(national));
      setCode("");
      setNotice("Enviamos um código de 6 dígitos no WhatsApp. Ele vale 5 minutos.");
      setStep("whatsapp-code");
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  async function submitWhatsappCode(event: FormEvent) {
    event.preventDefault();
    if (busy || !pendingToken) return;
    const national = nationalPhoneDigits(phone);
    if (!national || !/^\d{6}$/.test(code)) {
      setError("Informe o código de 6 dígitos.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await confirmSignupPhoneCode({ accessToken: pendingToken, phone: national, code });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      finishSession(result.accessToken || pendingToken);
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  async function resendWhatsappCode() {
    if (busy || !pendingToken) return;
    const national = nationalPhoneDigits(phone);
    if (!national) return;
    setBusy(true);
    setError(null);
    try {
      const result = await resendSignupPhoneCode({ accessToken: pendingToken, phone: national });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    } catch (cause) {
      setError(userMessage(cause, "Erro de conexão. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  const title = stepTitle(step);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="auth-dialog flex max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card p-0 text-foreground backdrop:bg-black/80"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
          onClick={requestClose}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {step === "home" ? (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <p className="text-2xl font-black tracking-tight text-foreground">
                DESAFIO<span className="text-primary">X</span>
              </p>
              <p className="text-sm text-muted-foreground">Sobreviva. Vença. Leve tudo.</p>
            </div>
            {googleConfigured ? (
              <Button type="button" variant="outline" size="lg" className="w-full" disabled={busy} onClick={() => void continueWithGoogle()}>
                <GoogleMark />
                Continuar com Google
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Continuar com Google indisponível neste ambiente.</p>
            )}
            {busy && step === "home" ? <p className="text-center text-xs text-muted-foreground">Entrando com Google…</p> : null}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep("email")}>
              Entrar com e-mail e senha
            </Button>
            <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep("phone")}>
              Entrar com telefone
            </Button>
          </div>
        ) : null}

        {step === "email" ? (
          <form className="space-y-4" onSubmit={(event) => void submitEmail(event)}>
            <label className="block space-y-2" htmlFor="auth-email">
              <span className={labelClass}>E-mail</span>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className={fieldClass}
              />
            </label>
            <label className="block space-y-2" htmlFor="auth-password">
              <span className={labelClass}>Senha</span>
              <span className="relative block">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${fieldClass} pr-12`}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </span>
            </label>
            <Button type="submit" variant="accent" className="w-full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </Button>
            <BackButton onClick={goHome} />
          </form>
        ) : null}

        {step === "phone" ? (
          <form className="space-y-4" onSubmit={(event) => void submitPhone(event)}>
            <label className="block space-y-2" htmlFor="auth-phone">
              <span className={labelClass}>WhatsApp</span>
              <input
                id="auth-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(maskPhoneInput(event.target.value))}
                placeholder="(11) 99999-0000"
                className={fieldClass}
              />
            </label>
            <p className="text-xs text-muted-foreground">Se o número já estiver na DESAFIOX, enviamos um código de 6 dígitos no WhatsApp.</p>
            <Button type="submit" variant="accent" className="w-full" disabled={busy}>
              {busy ? "Enviando…" : "Enviar código"}
            </Button>
            <BackButton onClick={goHome} />
          </form>
        ) : null}

        {step === "phone-code" ? (
          <form className="space-y-4" onSubmit={(event) => void submitPhoneCode(event)}>
            <CodeField code={code} onChange={setCode} />
            <Button type="submit" variant="accent" className="w-full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => void resendPhoneCode()}>
              Reenviar código
            </Button>
            <BackButton
              onClick={() => {
                setError(null);
                setNotice(null);
                setStep("phone");
              }}
            />
          </form>
        ) : null}

        {step === "google-profile" ? (
          <form className="space-y-4" onSubmit={(event) => void submitGoogleProfile(event)}>
            <p className="text-sm text-muted-foreground">
              Conta nova na DESAFIOX. Data de nascimento e WhatsApp são obrigatórios. Se a conta Google tiver esses dados, eles já vêm preenchidos.
            </p>
            <label className="block space-y-2" htmlFor="auth-birth">
              <span className={labelClass}>
                Data de nascimento <span className="text-primary">*</span>
              </span>
              <input
                id="auth-birth"
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                value={birthDate}
                maxLength={10}
                onChange={(event) => setBirthDate(maskBirthDateInput(event.target.value))}
                placeholder="dd/mm/aaaa"
                className={fieldClass}
              />
            </label>
            <label className="block space-y-2" htmlFor="auth-google-phone">
              <span className={labelClass}>
                WhatsApp <span className="text-primary">*</span>
              </span>
              <input
                id="auth-google-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(maskPhoneInput(event.target.value))}
                placeholder="(11) 99999-0000"
                className={fieldClass}
              />
            </label>
            <p className="text-xs text-muted-foreground">Cadastro só para maiores de 18 anos.</p>
            <Button type="submit" variant="accent" className="w-full" disabled={busy}>
              {busy ? "Concluindo…" : "Concluir cadastro"}
            </Button>
            <BackButton onClick={goHome} />
          </form>
        ) : null}

        {step === "whatsapp-code" ? (
          <form className="space-y-4" onSubmit={(event) => void submitWhatsappCode(event)}>
            <p className="text-sm text-muted-foreground">
              Confirme o código enviado no WhatsApp. Se preferir, deixe para depois: a pendência continua na conta.
            </p>
            <CodeField code={code} onChange={setCode} />
            <Button type="submit" variant="accent" className="w-full" disabled={busy}>
              {busy ? "Enviando…" : "Enviar"}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={requestClose}>
              Verificar depois
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => void resendWhatsappCode()}>
              Reenviar código
            </Button>
          </form>
        ) : null}

        {notice ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-primary" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}

function CodeField({ code, onChange }: { code: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2" htmlFor="auth-code">
      <span className={labelClass}>Código</span>
      <input
        id="auth-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        maxLength={6}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className={`${fieldClass} tracking-[0.3em]`}
      />
    </label>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={onClick}>
      Voltar
    </button>
  );
}

function stepTitle(step: Step): string {
  if (step === "email") return "Entrar com e-mail";
  if (step === "phone" || step === "phone-code") return "Entrar com telefone";
  if (step === "google-profile") return "Completar cadastro";
  if (step === "whatsapp-code") return "Confirmar WhatsApp";
  return "Entrar na DESAFIOX";
}

function userMessage(cause: unknown, fallback: string): string {
  if (cause instanceof TypeError) return "Erro de conexão. Tente novamente.";
  if (cause instanceof Error && cause.message && !cause.message.includes("NEXT_PUBLIC_API_URL")) return cause.message;
  return fallback;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.659 29.227 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
