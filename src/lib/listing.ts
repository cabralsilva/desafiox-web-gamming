export type OrderSense = "asc" | "desc";
export type ListingView = "grid" | "list";

export type SortField = {
  value: string;
  label: string;
};

export type ListingControls = {
  q: string;
  page: number;
  orderBy: string;
  orderSense: OrderSense;
  view: ListingView;
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseListingControls(
  raw: { [key: string]: string | string[] | undefined },
  sortFields: SortField[],
): ListingControls {
  const orderByValue = first(raw.orderBy);
  const sense = first(raw.orderSense);
  const view = first(raw.view);
  const pageNumber = Number(first(raw.page));
  const defaultOrderBy = sortFields[0]?.value ?? "_id";
  return {
    q: first(raw.q).trim().slice(0, 80),
    page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
    orderBy: sortFields.some((field) => field.value === orderByValue) ? orderByValue : defaultOrderBy,
    orderSense: sense === "asc" ? "asc" : "desc",
    view: view === "list" ? "list" : "grid",
  };
}

export function readPath(value: unknown, path: string): string | number {
  const current = path.split(".").reduce<unknown>((node, key) => {
    if (!node || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[key];
  }, value);
  if (typeof current === "number" && Number.isFinite(current)) return current;
  if (typeof current === "string") return current;
  return "";
}

export function sortByField<T>(items: T[], field: string, sense: OrderSense): T[] {
  const direction = sense === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const a = readPath(left, field);
    const b = readPath(right, field);
    if (typeof a === "number" && typeof b === "number") return (a - b) * direction;
    return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" }) * direction;
  });
}
