import {
  DeepPartial,
  EntityManager,
  FindOptionsRelations,
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
    public readonly currentUser: CurrentUserUtil,
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
    notDeleteIds?: number[],
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
      [this.resultKey]: resultId,
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
      notDeleteIds,
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

    const finalDataToSave = this.lastRefactoredAfterSave(
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
    resultId: number | number[],
    dataRole?: Enum,
    relations?: FindOptionsRelations<Entity>,
  ) {
    const dataToFind = Array.isArray(resultId) ? In(resultId) : resultId;
    const whereData = {
      [this.resultKey]: dataToFind,
      is_active: true,
    } as FindOptionsWhere<Entity>;

    if (dataRole !== null && dataRole !== undefined) {
      whereData[this.roleKey as any] = dataRole;
    }

    return this.mainRepo.find({
      where: whereData,
      relations,
    });
  }

  protected unsetMultiplesPrimary<T extends { is_primary: boolean }>(
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

  protected lastRefactoredAfterSave<Enum>(
    data: Partial<Entity>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    roleId: Enum = null,
  ): Partial<Entity>[] {
    // Override this method to add custom validation
    return data;
  }

  /**
   * @param resultId - The result ID
   * @param dataToSave - Data to save (can be single object or array)
   * @param compositeKeys - Array of field names to compare for uniqueness (e.g., ['field1', 'field2', 'field3'])
   * @param dataRole - Optional role ID
   * @param manager - Optional entity manager for transactions
   * @param otherAttributes - Additional attributes to include in the comparison
   * @returns Promise<Entity[]>
   * @description This method upserts data based on composite key comparison.
   * It compares records using multiple fields to determine uniqueness.
   * - Records matching all composite keys will be reused/updated
   * - Records not in the incoming array will be soft-deleted (is_active = false)
   * - Only makes 2-3 DB calls regardless of data size
   *
   * @example
   * // Compare by 3 fields: number, unit, description
   * upsertByCompositeKeys(
   *   123,
   *   [{number: 1, unit: 'kg', description: 'test'}],
   *   ['number', 'unit', 'description'],
   *   roleId
   * )
   */
  public async upsertByCompositeKeys<Enum extends string | number>(
    resultId: number,
    dataToSave: Partial<Entity> | Partial<Entity>[],
    compositeKeys: (keyof Entity & string)[],
    dataRole?: Enum,
    manager?: EntityManager,
    otherAttributes?: (keyof Entity & string)[],
  ): Promise<Entity[]> {
    const entityManager: RepositoryData | Repository<Entity> = selectManager<
      Entity,
      RepositoryData
    >(manager, this.entity, this.mainRepo);

    const dataToSaveArray = formatDataToArray<Partial<Entity>>(dataToSave);

    if (!dataToSaveArray || dataToSaveArray.length === 0) {
      // If no data, deactivate all existing records
      const whereData: FindOptionsWhere<any> = {
        [this.resultKey]: resultId,
        is_active: true,
      };
      if (dataRole && this.roleKey) {
        whereData[this.roleKey] = dataRole;
      }
      await entityManager.update(whereData, { is_active: false } as any);
      return [];
    }

    await this.createCustomValidation(dataToSaveArray);

    // 1. Get all existing records (active and inactive)
    const whereData: FindOptionsWhere<any> = {
      [this.resultKey]: resultId,
    };

    const formatWhitDataRole: any = {};
    if (dataRole && this.roleKey) {
      whereData[this.roleKey] = dataRole;
      formatWhitDataRole[this.roleKey] = dataRole;
    }

    const existingRecords = await entityManager.find({
      where: whereData,
    });

    // 2. Create a function to generate composite key
    const generateCompositeKey = (item: Partial<Entity>): string => {
      return compositeKeys
        .map((key) => {
          const value = item[key];
          return value !== null && value !== undefined ? String(value) : '';
        })
        .join('|');
    };

    // 3. Create a map of existing records by composite key
    const existingMap = new Map<string, Entity>();
    existingRecords.forEach((record) => {
      const key = generateCompositeKey(record);
      existingMap.set(key, record);
    });

    // 4. Process incoming data
    const processedData: Partial<Entity>[] = [];
    const idsToKeepActive: any[] = [];

    for (const item of dataToSaveArray) {
      const key = generateCompositeKey(item);
      const existing = existingMap.get(key);

      if (existing) {
        // Reuse existing record
        processedData.push({
          ...existing,
          ...this.setOtherAttributes(otherAttributes, item),
          ...formatWhitDataRole,
          is_active: true,
        });
        idsToKeepActive.push(existing[this.primaryKey]);
      } else {
        // Create new record
        const newRecord: any = {
          [this.resultKey]: resultId,
          ...formatWhitDataRole,
          ...this.setOtherAttributes(otherAttributes, item),
        };

        // Add composite key values
        compositeKeys.forEach((key) => {
          newRecord[key] = item[key];
        });

        newRecord.is_active = true;
        processedData.push(newRecord);
      }
    }

    // 5. Deactivate records not in the incoming array
    const activeExistingIds = existingRecords
      .filter((r) => r.is_active)
      .map((r) => r[this.primaryKey]);

    const idsToDeactivate = activeExistingIds.filter(
      (id) => !idsToKeepActive.includes(id),
    );

    if (idsToDeactivate.length > 0) {
      await entityManager.update(
        {
          [this.primaryKey]: In(idsToDeactivate),
        } as any,
        { is_active: false } as any,
      );
    }

    // 6. Save all data (TypeORM upserts automatically if id exists)
    const finalDataToSave = this.lastRefactoredAfterSave(
      processedData,
      dataRole,
    ).map((data) => ({
      ...data,
      ...this.currentUser.audit(SetAutitEnum.BOTH),
    }));

    const savedRecords = (await entityManager.save(
      finalDataToSave as DeepPartial<Entity>[],
    )) as Entity[];

    return savedRecords.filter((r) => r.is_active === true);
  }
}
