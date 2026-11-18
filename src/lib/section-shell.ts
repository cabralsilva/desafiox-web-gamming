const SECTION_PREFIXES = ["/mercado", "/carteira", "/desafios"] as const;

export function isSectionShell(pathname: string) {
  if (pathname === "/") return true;
  return SECTION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Painel do conteúdo de Desafios. A listagem e a evolução compartilham o mesmo esqueleto. */
export function desafiosPane(pathname: string): "list" | "evolution" | null {
  if (pathname === "/") return "list";
  if (pathname.startsWith("/desafios/")) return "evolution";
  return null;
}

/** Sentido da troca entre listagem e evolução. Fora desse par, o conteúdo entra sem animação. */
export function desafiosContentShift(from: string, to: string): "forward" | "back" | null {
  if (from === to) return null;
  const origin = desafiosPane(from);
  const target = desafiosPane(to);
  if (!origin || !target) return null;
  if (origin === "evolution" && target === "list") return "back";
  return "forward";
}
