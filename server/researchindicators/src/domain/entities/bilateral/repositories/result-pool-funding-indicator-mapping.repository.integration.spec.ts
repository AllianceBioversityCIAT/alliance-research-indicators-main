import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDataSource } from '../../../../db/config/mysql/orm.config';
import { dataSourceTarget } from '../../../../db/config/mysql/enum/data-source-target.enum';
import { ResultPoolFundingIndicatorMapping } from '../entities/result-pool-funding-indicator-mapping.entity';
import { ResultPoolFundingIndicatorMappingRepository } from './result-pool-funding-indicator-mapping.repository';

const runDatabaseIntegration =
  process.env.ARI_RUN_DB_INTEGRATION === 'true' ? describe : describe.skip;

runDatabaseIntegration(
  'ResultPoolFundingIndicatorMappingRepository (TEST datasource)',
  () => {
    let dataSource: DataSource;
    let repository: ResultPoolFundingIndicatorMappingRepository;

    beforeAll(async () => {
      dataSource = getDataSource(dataSourceTarget.TEST, true) as DataSource;
      await dataSource.initialize();
      repository = new ResultPoolFundingIndicatorMappingRepository(dataSource);
    });

    afterAll(async () => {
      await dataSource?.destroy();
    });

    it('flips active mappings to stale for an inactive catalog indicator', async () => {
      const resultId = Number(Date.now());
      const leverCode = `SP${resultId}`;
      const indicatorCode = `IND-${resultId}`;
      const mapping = dataSource.getRepository(
        ResultPoolFundingIndicatorMapping,
      );

      await dataSource.query('SET FOREIGN_KEY_CHECKS=0');
      await mapping.save({
        result_id: resultId,
        lever_code: leverCode,
        indicator_code: indicatorCode,
        indicator_type: 'capacity_sharing',
        is_stale: false,
        created_by: 1,
        updated_by: 1,
      });

      const affected = await repository.markActiveMappingsStaleByLeverIndicator(
        leverCode,
        indicatorCode,
        2,
      );
      const staleMappings =
        await repository.findActiveStaleMappingsByResultAndLevers(resultId, [
          leverCode,
        ]);

      expect(affected).toBe(1);
      expect(staleMappings).toEqual([
        expect.objectContaining({
          result_id: resultId,
          lever_code: leverCode,
          indicator_code: indicatorCode,
          is_stale: true,
        }),
      ]);

      await mapping.delete({ result_id: resultId });
      await dataSource.query('SET FOREIGN_KEY_CHECKS=1');
    });
  },
);
