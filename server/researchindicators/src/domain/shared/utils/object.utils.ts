import { FindOptionsRelations } from 'typeorm';

export const cleanObject = <T>(obj: T): Partial<T> => {
  const cleanedObj: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== '') {
      cleanedObj[key] = obj[key];
    }
  }
  return cleanedObj;
};

export const parseBoolean = <T>(obj: Partial<T>): FindOptionsRelations<T> => {
  const parsedObj: unknown = {};
  for (const key in obj) {
    parsedObj[key] = obj[key] === 'true' ? true : false;
  }
  return parsedObj as FindOptionsRelations<T>;
};

export const validObject = <T>(
  obj: Partial<T>,
  valid: (keyof T)[],
): boolean => {
  for (const key of valid) {
    if (obj[key] === null || obj[key] === '') {
      return false;
    }
  }
  return true;
};
