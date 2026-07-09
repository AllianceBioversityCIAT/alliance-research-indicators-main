import { OmitType, PartialType } from '@nestjs/swagger';
import { BulkUploadProcesses } from '../entities/bulk-upload-processes.entity';
import { BulkUploadResults } from '../entities/bulk-upload-results.entity';

export class createBulkUploadProcessesDto extends PartialType(
  OmitType(BulkUploadProcesses, ['id', 'bulkUploadResults']),
) { }
export class CreateBulkUploadResultsDto extends PartialType(
  OmitType(BulkUploadResults, [
    'id',
    'bulkUploadProcess',
    'bulk_upload_process_id',
  ]),
) { }

export class CreateAiReportDto {
  bulkUploadProcesses: createBulkUploadProcessesDto;
  bulkUploadResults: CreateBulkUploadResultsDto[];
}
