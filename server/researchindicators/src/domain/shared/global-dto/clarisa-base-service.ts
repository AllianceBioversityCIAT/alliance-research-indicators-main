import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { AuditableEntity } from './auditable.entity';
import { BaseServiceProperties } from './base-service';
import { CurrentUserUtil } from '../utils/current-user.util';

export abstract class ControlListBaseService<
  Entity extends AuditableEntity,
  RepositoryData extends Repository<Entity>,
> extends BaseServiceProperties<Entity, RepositoryData> {
  protected findByNameKey: keyof Entity & string;
  constructor(
    protected readonly entity: new () => Entity,
    protected readonly mainRepo: RepositoryData,
    currentUser: CurrentUserUtil,
    findByNameKey?: keyof Entity & string,
  ) {
    super(mainRepo, null, null, currentUser);
    this.primaryKey = this.mainRepo.metadata.primaryColumns?.[0]
      .propertyName as keyof Entity & string;

    this.findByNameKey = findByNameKey ?? ('name' as keyof Entity & string);
  }

  async findByName(name: string): Promise<Entity> {
    const where: FindOptionsWhere<Entity> = {
      is_active: true,
      [this.findByNameKey]: name,
    } as FindOptionsWhere<Entity>;
    return this.mainRepo.findOne({
      where: where,
    });
  }

  async findAll(
    relations: FindOptionsRelations<Entity> = {},
  ): Promise<Entity[]> {
    const where = { is_active: true } as FindOptionsWhere<Entity>;

    return this.mainRepo.find({
      where,
      relations,
    });
  }

  async findOne<T>(id: T): Promise<Entity> {
    const where = {
      is_active: true,
      [this.primaryKey]: id,
    } as FindOptionsWhere<Entity>;

    return this.mainRepo.findOne({
      where,
    });
  }
}
