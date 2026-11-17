/** Envelope de lista. A lib de domínio não define paginação. */
export interface IPaging {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export interface IPage<T> {
  items: T[];
  paging: IPaging;
}
