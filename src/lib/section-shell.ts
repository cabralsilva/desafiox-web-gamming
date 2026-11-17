const SECTION_PREFIXES = ["/mercado", "/carteira"] as const;

export function isSectionShell(pathname: string) {
  if (pathname === "/") return true;
  return SECTION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
