import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportYear } from './entities/report-year.entity';

@Injectable()
export class ReportYearService {
  constructor(private readonly dataSource: DataSource) {}

  async activeReportYear() {
    return this.dataSource.getRepository(ReportYear).findOne({
      where: { is_active: true },
    });
  }
}
