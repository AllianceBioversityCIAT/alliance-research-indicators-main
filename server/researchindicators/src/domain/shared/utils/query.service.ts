import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class QueryService {
  constructor(private readonly dataSource: DataSource) {}

  async deleteFullResultById(resultId: number): Promise<void> {
    await this.dataSource.query('SELECT full_delete_result_version(?)', [
      resultId,
    ]);
  }
}
