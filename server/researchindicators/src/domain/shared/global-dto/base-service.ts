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
import { isEmpty } from '../utils/object.utils';
import { CurrentUserUtil, SetAutitEnum } from '../utils/current-user.util';

export abstract class BaseServiceProperties<
  Entity extends AuditableEntity,
  RepositoryData extends Repository<Entity>,
> {
  protected primaryKey: keyof Entity & string;
  constructor(
    protected readonly mainRepo: RepositoryData,
    protected readonly resultKey: keyof Entity & string = null,
    protected readonly roleKey: keyof Entity & string = null,
    protected readonly currentUser: CurrentUserUtil,
  ) {
    this.primaryKey = this.mainRepo.metadata.primaryColumns?.[0]
      .propertyName as keyof Entity & string;
  }
}

export abstract class BaseDeleteService<
  Entity extends AuditableEntity,
  RepositoryData extends Repository<Entity>,
> extends BaseServiceProperties<Entity, RepositoryData> {
  constructor(
    mainRepo: RepositoryData,
    currentUser: CurrentUserUtil,
    resultKey: keyof Entity & string = null,
    roleKey: keyof Entity & string = null,
  ) {
    super(mainRepo, resultKey, roleKey, currentUser);
  }
  /**
   * @param resultId (required)
   * @param roleId (optional)
   * @returns Promise<void>
   * @description This method is used to delete data from the database, it receives the resultId and the roleId.
   * If the roleId is not passed, it will delete all the data that has the resultId.
   * Example: delete(1, 2) => Delete all the data that has the resultId 1 and the roleId 2.
   * Example: delete(1) => Delete all the data that has the resultId 1.
   */
  protected async delete<Enum extends string | number>(
    resultId: number,
    roleId?: Enum,
    date?: Date,
  ): Promise<void> {
    const whereData: any = {
      [this.resultKey]: resultId,
      is_active: true,
    };

    if (!isEmpty(roleId) && !isEmpty(this.roleKey)) {
      whereData[this.roleKey] = roleId;
    }

    const updateData: any = {
      is_active: false,
      deleted_at: date,
    };

    await this.mainRepo.update(whereData, updateData);
  }
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
> extends BaseDeleteService<Entity, RepositoryData> {
  constructor(
    protected readonly entity: new () => Entity,
    mainRepo: RepositoryData,
    resultKey: keyof Entity & string,
    currentUser: CurrentUserUtil,
    roleKey: keyof Entity & string = null,
  ) {
    super(mainRepo, currentUser, resultKey, roleKey);
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
    deleteOthersAttributes: { [K in keyof Entity]?: Entity[K] } = {},
  ) {
    const entityManager: RepositoryData | Repository<Entity> = selectManager<
      Entity,
      RepositoryData
    >(manager, this.entity, this.mainRepo);

    const dataToSaveArray = formatDataToArray<Partial<Entity>>(
      dataToSave,
    ).filter((el) => !isEmpty(el?.[generalCompareKey]));

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
      ...(dataRole ? { [this.roleKey]: dataRole } : {}),
    };

    const inactiveData: QueryDeepPartialEntity<any> = {
      is_active: false,
    };

    Object.keys(deleteOthersAttributes)?.forEach((key) => {
      inactiveData[key] = deleteOthersAttributes[key];
    });

    await entityManager.update(updateWhere, inactiveData);

    const finalDataToSave = await this.lastRefactoredAfterSave(
      newDataToSave,
      dataRole,
    ).map((data) => ({
      ...data,
      ...this.currentUser.audit(SetAutitEnum.BOTH),
    }));

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

  /**
   *
   * @param data
   * @param defaultData
   * @returns Partial<Entity>[]
   * @description This method is used only to transform an array of numbers or strings into an array
   * of objects to save in the database.
   * Example: [1, 2, 3] => [{result_id: 1}, {result_id: 2}, {result_id: 3}]
   * If you want to add more data to the object, you can pass a second parameter with the data you want
   * to add.
   * Example: [1, 2, 3] => [{result_id: 1, role: 'role'}, {result_id: 2, role: 'role'}, {result_id: 3, role: 'role'}]
   */
  public transformArrayToSaveObject(
    data: (number | string)[],
    defaultData: {
      [K in keyof Entity]?: [K];
    } = {},
  ): Partial<Entity>[] {
    return data.map(
      (item) =>
        ({
          [this.primaryKey]: item,
          ...defaultData,
        }) as Partial<Entity>,
    );
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

  protected unsetMultiplesPrimary<T extends { is_primary: boolean }>(
    data: Partial<T>[],
  ): Partial<T>[] {
    const isPrimary = data.filter((item) => item.is_primary == true);
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

  protected lastRefactoredAfterSave<Enum>(
    data: Partial<Entity>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    roleId: Enum = null,
  ): Partial<Entity>[] {
    // Override this method to add custom validation
    return data;
  }
}
