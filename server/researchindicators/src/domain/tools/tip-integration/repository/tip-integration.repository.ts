import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../../shared/utils/logger.util';

@Injectable()
export class TipIntegrationRepository {
  private readonly logger = new LoggerUtil({
    name: 'TipIntegrationRepository',
  });
  constructor(private readonly dataSource: DataSource) {}

  async allTipResultId(resultCodes: number[]): Promise<number[]> {
    const resultCodesQuery = resultCodes.join(',');
    const query = `select GROUP_CONCAT(r.result_id) as ids
                    from results r 
                    where r.platform_code = 'TIP'
                    AND r.result_official_code not in (${resultCodesQuery})`;
    const result = await this.dataSource.query(query);
    return result[0]?.ids?.split(',') ?? [];
  }

  async inactiveAllTipResults(resultId: number) {
    const query = `SELECT delete_result(?)`;
    await this.dataSource
      .query(query, [resultId])
      .then(() => {
        this.logger._debug(`Result ${resultId} deleted successfully.`);
      })
      .catch((error) => {
        this.logger._error(`Error deleting result ${resultId}: ${error}`);
      });
  }
}
