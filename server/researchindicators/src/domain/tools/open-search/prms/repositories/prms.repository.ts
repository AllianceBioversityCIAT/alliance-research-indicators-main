import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PrmsTemporalResponseMapper } from '../dto/prms-response.dto';

@Injectable()
export class PrmsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findTemporalResults(): Promise<PrmsTemporalResponseMapper[]> {
    const query = `SELECT
                    ptr.code,
                    ptr.\`year\`,
                    ptr.\`data\`,
                    CASE
                        WHEN ptr.\`year\`  < m.max_agno THEN 1
                        ELSE 0
                    END AS is_version
                 FROM prms_temporal_results ptr
                    INNER JOIN (
                    SELECT code, MAX(\`year\`) AS max_agno
                    FROM prms_temporal_results
                    GROUP BY code
                    ) m ON m.code = ptr.code
                ORDER BY ptr.code, ptr.\`year\`;`;
    return this.dataSource.query(query);
  }

  async deleteTemporalResults(): Promise<void> {
    const query = `DELETE FROM prms_temporal_results;`;
    await this.dataSource.query(query);
  }
}
