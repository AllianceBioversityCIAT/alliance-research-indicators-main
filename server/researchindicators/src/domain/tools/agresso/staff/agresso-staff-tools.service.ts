import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { AgressoToolsHttp } from './agresso-tools.connection.http';
import { BaseControlListSave } from '../../../shared/global-dto/base-control-list-save';
import { ResponseAgressoStaffDto } from './dto/response-agresso-staff.dto';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { allianceStaffMapper } from '../mappers/alliance-staff.mapper';

@Injectable()
export class AgressoStaffToolsService extends BaseControlListSave<AgressoToolsHttp> {
  constructor(dataSource: DataSource, http: HttpService) {
    super(
      dataSource,
      new AgressoToolsHttp(http),
      new Logger(AgressoStaffToolsService.name),
    );
  }

  private query(pages: number, size: number) {
    return `ErpEmploymentServices/api/v1/employees?page=${pages}&pageSize=${size}`;
  }

  private async findNumberOfPages() {
    const totalElements = await this.connection
      .getRaw<ResponseAgressoStaffDto<unknown>>(this.query(1, 1))
      .then(({ totalElements }) => totalElements);
    return (
      Math.round(totalElements / 1000) + (totalElements % 1000 !== 0 ? 1 : 0)
    );
  }

  async cloneAllAgressoStaff() {
    const pages = await this.findNumberOfPages();
    this._logger.log(`Total pages: ${pages}`);
    for (let i = 1; i <= pages; i++) {
      this._logger.log(`Processing page: ${i} of ${pages}`);
      await this.base<AgressoStaffRawDto, AllianceUserStaff>(
        this.query(i, 1000),
        AllianceUserStaff,
        (data) => allianceStaffMapper(data),
      );
    }
  }
}
