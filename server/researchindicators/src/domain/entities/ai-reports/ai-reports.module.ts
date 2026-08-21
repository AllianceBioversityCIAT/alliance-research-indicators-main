import { Module } from '@nestjs/common';
import { AiReportsService } from './ai-reports.service';
import { AiReportsController } from './ai-reports.controller';
import { AiMetadataRepository } from './repository/ia-metadata.repository';
import { TemplateModule } from '../../shared/auxiliar/template/template.module';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { CapdevBulkNotificationService } from './notifications/capdev-bulk-notification.service';
import { CapdevBulkNotificationRepository } from './notifications/capdev-bulk-notification.repository';

@Module({
  imports: [TemplateModule],
  controllers: [AiReportsController],
  providers: [
    AiReportsService,
    AiMetadataRepository,
    MessageMicroservice,
    CapdevBulkNotificationService,
    CapdevBulkNotificationRepository,
  ],
  exports: [
    AiReportsService,
    AiMetadataRepository,
    CapdevBulkNotificationService,
  ],
})
export class AiReportsModule {}
