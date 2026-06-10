import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BulkUploadProcesses } from '../entities/bulk-upload-processes.entity';
import { BulkUploadResults } from '../entities/bulk-upload-results.entity';

@Injectable()
export class AiMetadataRepository {
  public readonly bulkUploadProcessesRepository: Repository<BulkUploadProcesses>;
  public readonly bulkUploadResultsRepository: Repository<BulkUploadResults>;

  constructor(private readonly dataSource: DataSource) {
    this.bulkUploadProcessesRepository =
      this.dataSource.getRepository(BulkUploadProcesses);
    this.bulkUploadResultsRepository =
      this.dataSource.getRepository(BulkUploadResults);
  }
}
