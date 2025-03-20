import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
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
    return this.mainRepo.find();
  }
}
