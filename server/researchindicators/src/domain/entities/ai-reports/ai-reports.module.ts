import { Module } from '@nestjs/common';
import { AiReportsService } from './ai-reports.service';
import { AiReportsController } from './ai-reports.controller';
import { AiMetadataRepository } from './repository/ia-metadata.repository';

@Module({
  controllers: [AiReportsController],
  providers: [AiReportsService, AiMetadataRepository],
  exports: [AiReportsService, AiMetadataRepository],
})
export class AiReportsModule {}
