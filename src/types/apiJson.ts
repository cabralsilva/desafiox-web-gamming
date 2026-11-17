import type { Types } from "mongoose";

/**
 * Forma JSON que a API devolve a partir de um tipo do `c2-desafiox`.
 * `ObjectId` vira string e `Date` vira ISO. O modelo em si continua na lib.
 */
export type ApiJson<T> = T extends Types.ObjectId
  ? string
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? ApiJson<U>[]
      : T extends object
        ? { [K in keyof T]: ApiJson<T[K]> }
        : T;
