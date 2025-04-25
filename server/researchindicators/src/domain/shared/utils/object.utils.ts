import { FindOptionsRelations } from 'typeorm';

export const cleanObject = <T>(obj: T): Partial<T> => {
  const cleanedObj: Partial<T> = {};
  for (const key in obj) {
    if (
      obj[key] !== null &&
      obj[key] !== '' &&
      (typeof obj[key] == 'number' ? !isNaN(obj[key]) : true)
    ) {
      cleanedObj[key] = obj[key];
    }
  }
  return cleanedObj;
};

export const parseBoolean = <T>(obj: Partial<T>): FindOptionsRelations<T> => {
  const parsedObj: unknown = {};
  for (const key in obj) {
    parsedObj[key] = obj[key] === 'true';
  }
  return parsedObj as FindOptionsRelations<T>;
};

export const validObject = <T>(
  obj: Partial<T>,
  valid: (keyof T)[],
): ValidationResult => {
  const invalidFields: string[] = [];

  for (const key of valid) {
    if (isEmpty(obj[key])) {
      invalidFields.push(key as string);
    }
  }
  return {
    isValid: invalidFields.length === 0,
    invalidFields,
  };
};

export const isEmpty = <T>(attr: T) => {
  return (
    attr === null ||
    attr === '' ||
    (typeof attr === 'number' && isNaN(attr)) ||
    attr === undefined ||
    (Array.isArray(attr) && attr.length === 0)
  );
};

export interface ValidationResult {
  isValid: boolean;
  invalidFields: string[];
}
