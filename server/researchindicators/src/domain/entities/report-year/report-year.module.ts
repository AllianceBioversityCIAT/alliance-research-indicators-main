import { Module } from '@nestjs/common';
import { ReportYearService } from './report-year.service';
import { ReportYearController } from './report-year.controller';
import { ReportYearRepository } from './repositories/report-year.repository';

@Module({
  controllers: [ReportYearController],
  providers: [ReportYearService, ReportYearRepository],
  exports: [ReportYearService],
})
export class ReportYearModule {}
