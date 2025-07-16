import { Module } from '@nestjs/common';
import { DisseminationQualificationsService } from './dissemination-qualifications.service';
import { DisseminationQualificationsController } from './dissemination-qualifications.controller';

@Module({
  controllers: [DisseminationQualificationsController],
  providers: [DisseminationQualificationsService],
  exports: [DisseminationQualificationsService],
})
export class DisseminationQualificationsModule {}
