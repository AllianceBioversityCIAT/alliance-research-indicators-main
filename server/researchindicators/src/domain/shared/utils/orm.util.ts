import { EntityManager, Repository } from 'typeorm';

export const selectManager = <T>(
  manager: EntityManager,
  entity: new () => T,
  internal: Repository<T>,
) => {
  return manager ? manager.getRepository(entity) : internal;
};
