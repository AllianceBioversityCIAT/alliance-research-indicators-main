import { AuditableEntity } from '../global-dto/auditable.entity';

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
    } else {
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
