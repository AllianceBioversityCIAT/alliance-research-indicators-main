import { Injectable } from '@nestjs/common';
import { Between, DataSource, Repository } from 'typeorm';
import { ReportYear } from './entities/report-year.entity';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ReportYearService extends ControlListBaseService<
  ReportYear,
  Repository<ReportYear>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(ReportYear, dataSource.getRepository(ReportYear), currentUser);
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
    return this.mainRepo.find({
      where: {
        is_active: true,
        report_year: Between(fromYear, toYear),
      },
      order: { report_year: 'DESC' },
    });
  }
}
