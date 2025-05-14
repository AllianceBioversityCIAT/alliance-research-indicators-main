import { Module } from '@nestjs/common';
import { ReportingFeedbackService } from './reporting-feedback.service';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateModule } from '../../shared/auxiliar/template/template.module';
import { ReportingFeedbackController } from './reporting-feedback.controller';

@Module({
  controllers: [ReportingFeedbackController],
  imports: [TemplateModule],
  providers: [ReportingFeedbackService, MessageMicroservice],
  exports: [ReportingFeedbackService],
})
export class ReportingFeedbackModule {}
