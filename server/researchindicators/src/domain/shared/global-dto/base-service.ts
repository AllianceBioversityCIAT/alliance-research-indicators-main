import {
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  In,
  Not,
  Repository,
} from 'typeorm';
import { selectManager } from '../utils/orm.util';
import {
  filterPersistKey,
  formatDataToArray,
  updateArray,
} from '../utils/array.util';
import { AuditableEntity } from './auditable.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class BaseServiceProperties<RepositoryData> {
  protected mainRepo: RepositoryData;
}

/**
 *
 * @param Entity
 * @param RepositoryData
 * @description This class is a base class for a simple Entities services, exaple: The entities
 * that could extend this class are entities that only have to activate and deactivate data, for
 * example ResultInstitutions, stores the institution, the role and the result and is based on
 * adding more, deactivating or activating.
 */
export abstract class BaseServiceSimple<
  Entity extends AuditableEntity,
  RepositoryData extends Repository<Entity>,
> extends BaseServiceProperties<RepositoryData> {
  private readonly primaryKey: keyof Entity & string;
  constructor(
    protected readonly entity: new () => Entity,
    protected readonly mainRepo: RepositoryData,
    private readonly resultKey: keyof Entity & string,
    private readonly roleKey: keyof Entity & string = null,
  ) {
    super();
    this.primaryKey = this.mainRepo.metadata.primaryColumns?.[0]
      .propertyName as keyof Entity & string;
  }

  /**
   *
   * @param resultId
   * @param dataToSave
   * @param generalCompareKey
   * @param dataRole
   * @param manager
   * @returns
   * @description This method is used to create data in the database, it receives the resultId,
   * the data to save, the generalCompareKey, the dataRole and the manager.
   */
  public async create<Enum extends string | number>(
    resultId: number,
    dataToSave: Partial<Entity> | Partial<Entity>[],
    generalCompareKey: keyof Entity & string,
    dataRole?: Enum,
    manager?: EntityManager,
    otherAttributes?: (keyof Entity & string)[],
  ) {
    const entityManager: RepositoryData | Repository<Entity> = selectManager<
      Entity,
      RepositoryData
    >(manager, this.entity, this.mainRepo);

    const dataToSaveArray = formatDataToArray<Partial<Entity>>(dataToSave);

    await this.createCustomValidation(dataToSaveArray);

    const whereData: FindOptionsWhere<any> = {
      result_id: resultId,
      [generalCompareKey]: In(
        dataToSaveArray.map((data) => data[generalCompareKey]),
      ),
    };

    const formatWhitDataRole: any = {};

    if (dataRole && this.roleKey) {
      whereData[this.roleKey] = dataRole;
      formatWhitDataRole[this.roleKey] = dataRole;
    }

    const existData = await entityManager.find({
      where: whereData,
    });

    const formatData: Partial<Entity>[] = dataToSaveArray.map((data) => ({
      ...formatWhitDataRole,
      ...this.setOtherAttributes(otherAttributes, data),
      [this.primaryKey]: data?.[this.primaryKey],
      [generalCompareKey]: data?.[generalCompareKey],
    })) as Partial<Entity>[];

    const newDataToSave = updateArray<Entity>(
      formatData,
      existData,
      generalCompareKey,
      {
        key: this.resultKey,
        value: resultId,
      },
      this.primaryKey,
    );

    const persistId = filterPersistKey<Entity>(this.primaryKey, newDataToSave);

    const updateWhere: FindOptionsWhere<any> = {
      [this.resultKey]: resultId,
      [this.primaryKey]: Not(In(persistId)),
    };

    const inactiveData: QueryDeepPartialEntity<any> = {
      is_active: false,
    };

    await entityManager.update(updateWhere, inactiveData);

    const finalDataToSave = await this.lastRefactoredAftterSave(
      newDataToSave,
      dataRole,
    );

    const response = (
      await entityManager.save(finalDataToSave as DeepPartial<Entity>[])
    ).filter((data) => data.is_active === true);

    return response;
  }

  private setOtherAttributes(
    otherAttributes: (keyof Entity & string)[],
    data: Partial<Entity>,
  ) {
    const dataWithOtherAttributes: Partial<Entity> = {};
    otherAttributes?.forEach((attribute) => {
      dataWithOtherAttributes[attribute] = data[attribute];
    });

    return dataWithOtherAttributes;
  }

  public async find<Enum extends string | number>(
    resultId: number,
    dataRole?: Enum,
  ) {
    const whereData = {
      [this.resultKey]: resultId,
      is_active: true,
    } as FindOptionsWhere<Entity>;

    if (dataRole !== null && dataRole !== undefined) {
      whereData[this.roleKey as any] = dataRole;
    }

    return this.mainRepo.find({
      where: whereData,
    });
  }

  protected unsetMultiplesPrimaryContracts<T extends { is_primary: boolean }>(
    data: Partial<T>[],
  ): Partial<T>[] {
    const isPrimary = data.filter((item) => item.is_primary);
    if (isPrimary.length > 1) {
      data.forEach((item) => {
        item.is_primary = false;
      });
    }
    return data;
  }

  protected async createCustomValidation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataArray: Partial<Entity>[],
  ): Promise<void> {
    // Override this method to add custom validation
  }

  protected lastRefactoredAftterSave<Enum>(
    data: Partial<Entity>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    roleId: Enum = null,
  ): Partial<Entity>[] {
    // Override this method to add custom validation
    return data;
  }
}
