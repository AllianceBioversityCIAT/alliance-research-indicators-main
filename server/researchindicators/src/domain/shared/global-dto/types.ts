import { FindOptionsWhere } from 'typeorm';

export type ValueOrArray<T> = {
  [K in keyof T]: T[K] | T[K][];
};

export type TypeToBoolean<T> = {
  [K in keyof T]: boolean;
};

export type BasicWhere<T> = {
  not_in: FindOptionsWhere<ValueOrArray<T>>;
  in: FindOptionsWhere<ValueOrArray<T>>;
};
