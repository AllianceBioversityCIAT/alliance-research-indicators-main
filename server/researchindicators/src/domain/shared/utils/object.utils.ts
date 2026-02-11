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

/**
 *
 * @param obj
 * @param setAttributes
 * @param defaultValue
 * @returns
 * Sets default values for specified attributes in an object.
 * If the attribute is already set, it will not override it.
 */
export const setDefaultValueInObject = <T>(
  obj: Partial<T>,
  setAttributes: (keyof T)[],
  defaultValue: any = null,
) => {
  if (!obj || typeof obj !== 'object') return {};

  for (const key of setAttributes) {
    obj[key] = defaultValue;
  }
  return { ...obj };
};

export const setNull = <T>(data: T) => {
  return isEmpty(data) ? null : data;
};

export const defaultValue = <T>(
  data: T,
  condition: boolean,
  defaultValue: any = null,
) => {
  return condition ? data : defaultValue;
};

export interface ValidationResult {
  isValid: boolean;
  invalidFields: string[];
}

export const cleanText = (text: string) => {
  return text?.toLowerCase()?.trim();
};

export const cleanName = (name: string) => {
  const names = name?.split(' ');
  return names
    ?.map((name) => {
      const cleanName = cleanText(name);
      const cleanFirstLetter = cleanName?.charAt(0)?.toUpperCase();
      return cleanFirstLetter + cleanName?.slice(1);
    })
    ?.join(' ');
};
