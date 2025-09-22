import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';
import { AllianceStaffOpenSearchController } from './alliance-staff.opensearch.controller';
import { OpenSearchAllianceStaffApi } from './alliance-staff.opensearch.api';
import { AllianceUserStaffRepository } from '../../../entities/alliance-user-staff/repository/alliance-user-staff.repository';

@Module({
  controllers: [AllianceStaffOpenSearchController],
  providers: [
    OpenSearchAllianceStaffApi,
    ResultRepository,
    AllianceUserStaffRepository,
  ],
  exports: [OpenSearchAllianceStaffApi, AllianceUserStaffRepository],
  imports: [HttpModule],
})
export class AllianceStaffOpenSearchModule {}
