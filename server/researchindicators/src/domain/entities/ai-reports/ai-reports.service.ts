import { Injectable } from '@nestjs/common';
import { CreateAiReportDto } from './dto/create-ai-report.dto';
import { AiMetadataRepository } from './repository/ia-metadata.repository';
import { BulkUploadResults } from './entities/bulk-upload-results.entity';

@Injectable()
export class AiReportsService {
  constructor(private readonly aiMetadataRepository: AiMetadataRepository) {
  }

  async create(createAiReportDto: CreateAiReportDto) {
    const { bulkUploadProcesses, bulkUploadResults } = createAiReportDto;

    const newBulkUploadProcess = await this.aiMetadataRepository.bulkUploadProcessesRepository.save(bulkUploadProcesses);

    const savedBulkUploadResults: BulkUploadResults[] = [];
    for (const item of bulkUploadResults) {
      const savedBulkUploadResult = new BulkUploadResults();
      savedBulkUploadResult.bulk_upload_process_id = newBulkUploadProcess.id;
      savedBulkUploadResult.missing_fields = item.missing_fields;
      savedBulkUploadResult.manual_intervention_occurred = item.manual_intervention_occurred;
      savedBulkUploadResult.suggested_status = item.suggested_status;
      savedBulkUploadResult.final_status = item.final_status;
      savedBulkUploadResult.result_id = item.result_id;
      savedBulkUploadResults.push(savedBulkUploadResult);
    }
    await this.aiMetadataRepository.bulkUploadResultsRepository.save(savedBulkUploadResults);

    return newBulkUploadProcess;

  }
}
