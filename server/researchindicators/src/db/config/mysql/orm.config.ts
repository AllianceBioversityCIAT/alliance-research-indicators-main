import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from 'process';
import { dataSourceTarget } from './enum/data-source-target.enum';

/**
 *
 * @param target
 * @returns
 */
export const getDataSource = (
  target: dataSourceTarget = dataSourceTarget.CORE,
  shouldProcess: boolean = false,
): DataSource | DataSourceOptions => {
  let host: string;
  let username: string;
  let password: string;
  let database: string;
  let entities: string[];
  let name: string;

  if ([dataSourceTarget.CORE, dataSourceTarget.SECONDARY].includes(target)) {
    host = env.ARI_MYSQL_HOST;
    username = env.ARI_MYSQL_USER_NAME;
    password = env.ARI_MYSQL_USER_PASS;
    entities = [
      `${__dirname}/../../../domain/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../../domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
    ];
  }

  switch (target) {
    case dataSourceTarget.CORE:
      name = 'default';
      database = env.ARI_MYSQL_NAME;
      break;
    case dataSourceTarget.TEST:
      host = env.ARI_TEST_MYSQL_HOST;
      username = env.ARI_TEST_MYSQL_USER_NAME;
      password = env.ARI_TEST_MYSQL_USER_PASS;
      database = env.ARI_TEST_MYSQL_NAME;

      break;
    case dataSourceTarget.SECONDARY:
      name = 'secondary';
      database = env.ARI_SECONDARY_MYSQL_NAME;
      entities = [
        `${__dirname}/../../../domain/complementary-entities/secondary/**/*.entity{.ts,.js}`,
      ];
      break;
  }

  const dataSourceOptions: DataSourceOptions = {
    name: name,
    type: 'mysql',
    host: host,
    port: parseInt(env.DB_PORT),
    username: username,
    password: password,
    database: database,
    entities: entities,
    synchronize: false,
    migrationsRun: false,
    bigNumberStrings: false,
    logging: false,
    migrations: [`${__dirname}/../../migrations/**/*{.ts,.js}`],
    migrationsTableName: 'migrations',
    metadataTableName: 'orm_metadata',
    extra: {
      namedPlaceholders: true,
      charset: 'utf8mb4_unicode_520_ci',
    },
  };

  if (shouldProcess) {
    return new DataSource(dataSourceOptions);
  } else {
    return dataSourceOptions;
  }
};

export const dataSource: DataSource = <DataSource>(
  getDataSource(dataSourceTarget.CORE, true)
);
