import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportYear } from './entities/report-year.entity';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ReportYearRepository } from './repositories/report-year.repository';
import { ResultsUtil } from '../../shared/utils/results.util';

@Injectable()
export class ReportYearService extends ControlListBaseService<
  ReportYear,
  ReportYearRepository
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
    reportYearRepository: ReportYearRepository,
    private readonly resultsUtil: ResultsUtil,
  ) {
    super(ReportYear, reportYearRepository, currentUser);
  }

  async activeReportYear() {
    return this.dataSource.getRepository(ReportYear).findOne({
      where: { is_active: true },
    });
  }

  async getReportYear() {
    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - 5;
    const toYear = currentYear + 2;
    return this.mainRepo.getAllReportYears(
      {
        from: fromYear,
        to: toYear,
      },
      this.resultsUtil.nullResultCode,
    );
  }
}
