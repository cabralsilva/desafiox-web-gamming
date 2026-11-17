const BLOCKED_TAGS = "script|iframe|object|embed|link|meta|form";

/** Mantém o HTML das regras e remove o que pode executar script. */
export function sanitizeRulesHtml(html: string): string {
  let output = html.replace(new RegExp(`<(${BLOCKED_TAGS})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, "gi"), "");
  output = output.replace(new RegExp(`<(${BLOCKED_TAGS})\\b[^>]*\\/?>`, "gi"), "");
  output = output.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  output = output.replace(/\s+(href|src|xlink:href)\s*=\s*(['"])\s*(?:javascript:|data:text\/html)[^'"]*\2/gi, "");
  output = output.replace(/\s+(href|src|xlink:href)\s*=\s*(?:javascript:|data:text\/html)[^\s>]+/gi, "");
  return output;
}
