import { DataSourceOptions } from 'typeorm';
import { dataSource as testDataSource } from './orm.test.config';
import { getDataSource } from './orm.config';
import { dataSourceTarget } from './enum/data-source-target.enum';

/**
 * Connection collation for CAST / string literals (design §5 Collation,
 * pivot T-07). `orm.test.config.ts` spreads `getDataSource(TEST)` and
 * overrides only the port, so both targets share `extra.charset`.
 */
const CONNECTION_CHARSET = 'utf8mb4_0900_ai_ci';

function charsetOf(options: DataSourceOptions): string | undefined {
  return (options.extra as { charset?: string } | undefined)?.charset;
}

describe('orm.config connection charset', () => {
  it('sets CORE extra.charset to utf8mb4_0900_ai_ci', () => {
    const options = getDataSource(
      dataSourceTarget.CORE,
      false,
    ) as DataSourceOptions;
    expect(charsetOf(options)).toBe(CONNECTION_CHARSET);
  });

  it('sets TEST extra.charset to utf8mb4_0900_ai_ci', () => {
    const options = getDataSource(
      dataSourceTarget.TEST,
      false,
    ) as DataSourceOptions;
    expect(charsetOf(options)).toBe(CONNECTION_CHARSET);
  });

  it('keeps that charset on the TEST datasource (orm.test.config spread)', () => {
    expect(charsetOf(testDataSource.options)).toBe(CONNECTION_CHARSET);
  });
});
