import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  TemportalDataResponse,
} from '../dto/prms-response.dto';

@Injectable()
export class PrmsRepository {
  constructor(private readonly dataSource: DataSource) { }

  async findTemporalResults<T>(
    executionCode: string,
  ): Promise<TemportalDataResponse<T>[]> {
    const query = `SELECT
                    ptr.code,
                    ptr.\`year\`,
                    ptr.\`data\`,
                    CASE
                        WHEN ptr.\`year\`  < m.max_agno THEN 1
                        ELSE 0
                    END AS is_version
                 FROM sync_staging_records ptr
                    INNER JOIN (
                    SELECT code, MAX(\`year\`) AS max_agno
                    FROM sync_staging_records
                    WHERE execution_code = ?
                    GROUP BY code
                    ) m ON m.code = ptr.code
                WHERE ptr.execution_code = ?
                ORDER BY ptr.code, ptr.\`year\`;`;
    return this.dataSource.query(query, [executionCode, executionCode]);
  }

  async deleteTemporalResults(executionCode: string): Promise<void> {
    const query = `DELETE FROM sync_staging_records WHERE execution_code = ?;`;
    await this.dataSource.query(query, [executionCode]);
  }
}
