import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseOpenSearchApi } from '../core/base-open-search-api';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { AllianceUserStaffRepository } from '../../../entities/alliance-user-staff/repository/alliance-user-staff.repository';
import { AllianceStaffOpensearchDto } from './dto/alliance-staff.opensearch.dto';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';

@Injectable()
export class OpenSearchAllianceStaffApi extends BaseOpenSearchApi<
  AllianceUserStaff,
  AllianceStaffOpensearchDto,
  AllianceUserStaffRepository
> {
  constructor(
    httpService: HttpService,
    mainRepo: AllianceUserStaffRepository,
    appConfig: AppConfig,
  ) {
    super(
      httpService,
      mainRepo,
      appConfig,
      undefined,
      AllianceStaffOpensearchDto,
    );
  }
}
