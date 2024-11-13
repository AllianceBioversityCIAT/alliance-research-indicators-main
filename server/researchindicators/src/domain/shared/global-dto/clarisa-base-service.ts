import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { AuditableEntity } from './auditable.entity';
import { BaseServiceProperties } from './base-service';

export abstract class ControlListBaseService<
  Entity extends AuditableEntity,
  RepositoryData extends Repository<Entity>,
> extends BaseServiceProperties<RepositoryData> {
  private readonly primaryKey: keyof Entity & string;
  constructor(
    protected readonly entity: new () => Entity,
    protected readonly mainRepo: RepositoryData,
  ) {
    super();
    this.primaryKey = this.mainRepo.metadata.primaryColumns?.[0]
      .propertyName as keyof Entity & string;
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
