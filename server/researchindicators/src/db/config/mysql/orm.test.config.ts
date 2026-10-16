import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from 'process';
import { getDataSource } from './orm.config';
import { dataSourceTarget } from './enum/data-source-target.enum';

/**
 * Sibling datasource module for the disposable scratch schema.
 *
 * `orm.config.ts:71-73` exports a single `CORE`-bound `DataSource` at module
 * load, which TypeORM's CLI `-d` flag imports verbatim — it cannot be
 * retargeted at runtime. This module reuses `getDataSource(dataSourceTarget.TEST)`
 * for every option (host/username/password/database/entities/migrations),
 * only overriding `port` from `ARI_TEST_MYSQL_PORT` (`orm.config.ts:46` reads
 * `DB_PORT` for both targets, which cannot address a scratch container on a
 * non-default port).
 *
 * Never point `ARI_TEST_MYSQL_*` at `ARI_MYSQL_*` (the shared, non-disposable
 * dev database) — see root CLAUDE.md §4.3.
 */
const baseDataSourceOptions = getDataSource(
  dataSourceTarget.TEST,
  false,
) as DataSourceOptions;

const testDataSourceOptions: DataSourceOptions = {
  ...(baseDataSourceOptions as unknown as Record<string, unknown>),
  port: parseInt(env.ARI_TEST_MYSQL_PORT, 10),
} as DataSourceOptions;

export const dataSource: DataSource = new DataSource(testDataSourceOptions);
