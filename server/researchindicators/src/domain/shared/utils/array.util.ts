import { AuditableEntity } from '../global-dto/auditable.entity';
import { isEmpty } from './object.utils';

/**
 *
 * @param clientArray  The array to be updated
 * @param backendArray   The array to be used to update the client array
 * @param key  The key to be used to compare the arrays
 * @param parent  The parent object to be added to the client array
 * @returns  The updated client array
 * @description This method updates the client array with the backend array
 * based on the key provided, if the item is not found in the client array
 * it will be added with the parent object
 * @example  updateArray(clientArray, backendArray, 'id', { key: 'parent_id', value: 1 })
 */
export const updateArray = <T>(
  clientArray: Partial<T>[],
  backendArray: T[],
  comparisonKey: keyof T & string,
  parent: {
    key: keyof T & string;
    value: any;
  },
  primaryKey?: keyof T & string,
  notDeleteIds?: number[],
): Partial<T>[] => {
  clientArray = clientArray ?? [];
  clientArray = clientArray.map((item) => ({
    ...item,
    [parent.key]: parent.value,
  }));
  backendArray?.forEach((bItem) => {
    const clientArrayItemIndex = clientArray.findIndex(
      (item) => item[comparisonKey] === bItem[comparisonKey],
    );
    if (clientArrayItemIndex !== -1) {
      const temp = clientArray[clientArrayItemIndex];
      delete temp[comparisonKey];
      clientArray[clientArrayItemIndex] = {
        ...bItem,
        ...temp,
        is_active: true,
        [parent.key]: parent.value,
      };
      if (primaryKey) {
        clientArray[clientArrayItemIndex][primaryKey] = bItem[primaryKey];
      }
    } else if (
      !notDeleteIds?.includes(bItem[primaryKey as keyof T] as number)
    ) {
      clientArray.push({
        ...bItem,
        is_active: false,
        [parent.key]: parent.value,
      });
    }
  });
  return clientArray;
};

/**
 *
 * @param primaryKey
 * @param data
 * @returns  The primary key of the data
 * @description This method filters the primary key of the data provided and returns it
 * @example  filterPersistKey('id', data)
 * @example  filterPersistKey('user_id', data)
 */
export const filterPersistKey = <T extends AuditableEntity>(
  primaryKey: keyof T,
  data: Partial<T>[],
): T[keyof T][] => {
  return data
    .filter(
      (data) =>
        (data.is_active !== null || data.is_active !== undefined) &&
        data[primaryKey] !== undefined,
    )
    .map((data) => data[primaryKey]);
};

export const validTypeOfArray = (array: any[]): string[] => {
  return array.map((item) => {
    return `${item}`.replace(/[^a-zA-Z0-9]/g, '');
  });
};

export const isNotEmpty = <T>(array: T | T[]): boolean => {
  let response = true;
  if (array === undefined || array === null) response = false;
  if (Array.isArray(array) && !array.length) response = false;
  return response;
};

export const formatDataToArray = <T>(data: T | T[]): T[] => {
  if (isNotEmpty<T>(data)) {
    return Array.isArray(data) ? data : [data];
  }
  return [];
};

export const isArrayOfType = <T>(
  arr: unknown[],
  typeChecker: (element: unknown) => element is T,
): arr is T[] => {
  return arr.every(typeChecker);
};

export function intersection<A>(arrayA: A[], arrayB: A[]): A[] {
  return arrayA.filter((item) => arrayB.includes(item));
}

export function mergeArraysWithPriority<T>(
  arrayA: Partial<T>[],
  arrayB: Partial<T>[],
  comparisonKey: keyof T,
): Partial<T>[] {
  const result = [...arrayA];
  const existingKeys = new Set(arrayA.map((item) => item[comparisonKey]));

  arrayB.forEach((item) => {
    if (!existingKeys.has(item[comparisonKey])) {
      result.push(item);
    }
  });

  return result;
}

export const getItemsAtLevel = <T extends { children?: T[] }>(
  items: T[],
  level: number,
): T[] => {
  if (level < 1) return [];
  if (level === 1) {
    return items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, ...rest } = item;
      return rest as T;
    });
  }

  let result: T[] = [];
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      result = result.concat(getItemsAtLevel(item.children, level - 1));
    }
  }
  return result;
};

export const filterByUniqueKeyWithPriority = <T>(
  array: T[],
  keyField: keyof T,
  priorityField: keyof T,
): T[] => {
  const map = new Map<any, T>();

  for (const item of array ?? []) {
    const key = item[keyField];
    const existing = map.get(key);

    if (
      !existing ||
      (item[priorityField] != null && !existing[priorityField])
    ) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
};

export const removeDuplicatesByKeys = <T>(
  array: T[],
  keys: (keyof T)[],
): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const compositeKey = keys
      .map((key) => {
        const value = item[key];
        if (isEmpty(value)) {
          return '';
        }
        return typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
      })
      .join('|');
    if (seen.has(compositeKey)) {
      return false;
    }
    seen.add(compositeKey);
    return true;
  });
};

export type ArrayType<T> = T extends (infer U)[] ? U : T;
