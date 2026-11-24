/** WhatsApp nacional com DDD, sem DDI e sem máscara. Ex.: 11999990000. */
export function nationalPhoneDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits)) return null;
  let national = digits;
  if (national.startsWith("55") && (national.length === 12 || national.length === 13)) {
    national = national.slice(2);
  }
  if ((national.length !== 10 && national.length !== 11) || national.startsWith("0")) return null;
  return national;
}

/** Máscara (00) 00000-0000 ou (00) 0000-0000 enquanto a pessoa digita. */
export function maskPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const cut = national.slice(0, 11);
  if (cut.length <= 2) return cut.length ? `(${cut}` : "";
  if (cut.length <= 6) return `(${cut.slice(0, 2)}) ${cut.slice(2)}`;
  if (cut.length <= 10) return `(${cut.slice(0, 2)}) ${cut.slice(2, 6)}-${cut.slice(6)}`;
  return `(${cut.slice(0, 2)}) ${cut.slice(2, 7)}-${cut.slice(7, 11)}`;
}
