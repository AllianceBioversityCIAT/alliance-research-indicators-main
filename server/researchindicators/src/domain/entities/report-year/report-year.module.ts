import { Module } from '@nestjs/common';
import { ReportYearService } from './report-year.service';
import { ReportYearController } from './report-year.controller';

@Module({
  controllers: [ReportYearController],
  providers: [ReportYearService],
  exports: [ReportYearService],
})
export class ReportYearModule {}
