import { dataSource } from '../../src/db/config/mysql/orm.test.config';

/**
 * Smoke fixture for the T-01 scratch-schema harness.
 *
 * Proves the TEST datasource actually connects — not merely that it
 * compiles. Must PASS with the scratch container up (`npm run
 * compose:test:up`) and FAIL with it down.
 */
describe('scratch-schema smoke fixture', () => {
  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('connects to the TEST datasource and runs a trivial query', async () => {
    await dataSource.initialize();
    const result = await dataSource.query('SELECT 1 AS ok');
    expect(result[0].ok).toBe(1);
  });
});
