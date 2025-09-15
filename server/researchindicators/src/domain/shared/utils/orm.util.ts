import { EntityManager, Repository } from 'typeorm';
import { isEmpty } from './object.utils';

export const selectManager = <
  T,
  CustomRepo extends Repository<T> = Repository<T>,
>(
  manager: EntityManager,
  entity: new () => T,
  internal: CustomRepo,
): CustomRepo | Repository<T> => {
  return manager ? manager.getRepository(entity) : internal;
};

export const cleanNumberForDB = (value: string | number) => {
  const tempvalue = Number(value);
  if (!isEmpty(tempvalue) && !isNaN(tempvalue)) {
    return tempvalue;
  }
  return 0;
};
