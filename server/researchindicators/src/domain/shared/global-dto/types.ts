import { FindOptionsWhere } from 'typeorm';

export type ValueOrArray<T> = {
  [K in keyof T]?: T[K] | T[K][] | null;
};

export type TypeToBoolean<T> = {
  [K in keyof T]: boolean;
};

export type BasicWhere<T> = {
  [K in keyof T]?: {
    value: T[K] | T[K][] | null;
    not: boolean;
  };
};
