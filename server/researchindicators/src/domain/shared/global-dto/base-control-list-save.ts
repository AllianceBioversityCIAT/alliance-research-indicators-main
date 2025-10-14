import { Logger } from '@nestjs/common';
import { DataSource, DeepPartial } from 'typeorm';

export abstract class BaseControlListSave<
  Connection extends ConnectionInterface,
> {
  protected readonly _logger: Logger;
  constructor(
    public readonly dataSource: DataSource,
    protected readonly connection: Connection,
    logger: Logger,
  ) {
    this._logger = logger;
  }

  protected async base<T, Y = T>(
    path: string,
    entity: new () => Y,
    mapper?: (data: T) => DeepPartial<Y>,
    iterator?: (data: T[]) => DeepPartial<Y>[],
  ): Promise<Y[]> {
    this._logger.log(`Fetching data from ${entity.name}`);
    const data: T[] = await this.connection.get<T[]>(path).catch((err) => {
      this._logger.error(
        `Error fetching data from ${entity.name} path: ${path}`,
      );
      this._logger.error(err);
      return [];
    });

    let modifyData: DeepPartial<Y>[];
    if (iterator) {
      modifyData = iterator(data);
    } else if (mapper) {
      modifyData = data.map((item) => mapper(item));
    } else {
      modifyData = data as unknown as Y[];
    }
    const saveData: Y[] = await this.dataSource
      .getRepository(entity)
      .save(modifyData)
      .then((data) => {
        this._logger.log(`Data saved for ${entity.name}`);
        return data;
      });

    return saveData;
  }

  protected async baseBatches<T, Y = T>(
    path: string,
    entity: new () => Y,
    batchSize: number = 100,
    mapper?: (data: T) => DeepPartial<Y>,
    iterator?: (data: T[]) => DeepPartial<Y>[],
  ): Promise<Y[]> {
    this._logger.log(`Fetching data from ${entity.name}`);
    const data: T[] = await this.connection.get<T[]>(path).catch((err) => {
      this._logger.error(
        `Error fetching data from ${entity.name} path: ${path}`,
      );
      this._logger.error(err);
      return [];
    });

    let modifyData: DeepPartial<Y>[];
    if (iterator) {
      modifyData = iterator(data);
    } else if (mapper) {
      modifyData = data.map((item) => mapper(item));
    } else {
      modifyData = data as unknown as Y[];
    }
    const batches: DeepPartial<Y>[][] = [];
    for (let i = 0; i < modifyData.length; i += batchSize) {
      batches.push(modifyData.slice(i, i + batchSize));
    }
    const saveData: Y[] = [];
    this._logger.log(
      `Saving data in ${batches.length} batches for ${entity.name}`,
    );
    for (const [index, batch] of batches.entries()) {
      const resTemp = await this.dataSource
        .getRepository(entity)
        .save(batch)
        .then((data) => {
          this._logger.log(`Data saved for ${entity.name} batch of ${index}`);
          return data;
        });

      saveData.push(...resTemp);
    }

    return saveData;
  }
}

export interface ConnectionInterface {
  get<T>(path: string): Promise<T>;
}
