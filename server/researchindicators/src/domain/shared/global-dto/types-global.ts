export type BooleanKeys<T> = {
  [K in keyof T]: boolean;
};

export type StringKeys<T> = {
  [K in keyof T]: string;
};
