import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
