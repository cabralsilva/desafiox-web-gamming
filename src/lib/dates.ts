const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateBR(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return dateFormat.format(date);
}

export function isCurrentPricingWindow(
  window: { initDateTime: string; endDateTime: string },
  now: Date,
) {
  const start = new Date(window.initDateTime).getTime();
  const end = new Date(window.endDateTime).getTime();
  const time = now.getTime();
  return time >= start && time <= end;
}
