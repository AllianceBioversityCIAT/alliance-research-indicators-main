import { EntityManager, Repository } from 'typeorm';

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
