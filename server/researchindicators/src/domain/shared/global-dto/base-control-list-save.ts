import { Logger } from '@nestjs/common';
import { DataSource, DeepPartial } from 'typeorm';

export abstract class BaseControlListSave<
  Connection extends ConnectionInterface,
> {
  protected readonly _logger: Logger;
  protected readonly connection: Connection;
  protected readonly dataSource: DataSource;
  constructor(dataSource: DataSource, connection: Connection, logger: Logger) {
    this._logger = logger;
    this.dataSource = dataSource;
    this.connection = connection;
  }

  protected async base<T, Y = T>(
    path: string,
    entity: new () => Y,
    mapper?: (data: T) => DeepPartial<Y>,
    iterator?: (data: T[]) => DeepPartial<Y>[],
  ): Promise<Y[]> {
    this._logger.log(`Fetching data from Clarisa API for ${entity.name}`);
    const data: T[] = await this.connection.get<T[]>(path).catch((err) => {
      this._logger.error(
        `Error fetching data from Clarisa API for ${entity.name} path: ${path}`,
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
}

export interface ConnectionInterface {
  get<T>(path: string): Promise<T>;
}
