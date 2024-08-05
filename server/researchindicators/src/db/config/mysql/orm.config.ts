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

  if (target === dataSourceTarget.CORE) {
    host = env.ARI_MYSQL_HOST;
    username = env.ARI_MYSQL_USER_NAME;
    password = env.ARI_MYSQL_USER_PASS;
    database = env.ARI_MYSQL_NAME;
  }
  if (target === dataSourceTarget.TEST) {
    host = env.ARI_TEST_MYSQL_HOST;
    username = env.ARI_TEST_MYSQL_USER_NAME;
    password = env.ARI_TEST_MYSQL_USER_PASS;
    database = env.ARI_TEST_MYSQL_NAME;
  }
  const dataSourceOptions: DataSourceOptions = {
    type: 'mysql',
    host: host,
    port: parseInt(env.DB_PORT),
    username: username,
    password: password,
    database: database,
    entities: [`${__dirname}/../../../domain/**/*.entity{.ts,.js}`],
    synchronize: false,
    migrationsRun: false,
    bigNumberStrings: false,
    logging: true,
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
