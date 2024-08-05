type BooleanKeys<T> = {
  [K in keyof T]: boolean;
};

type StringKeys<T> = {
  [K in keyof T]: string;
};
