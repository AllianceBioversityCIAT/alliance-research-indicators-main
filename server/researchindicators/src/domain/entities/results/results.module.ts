import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultRepository } from './repositories/result.repository';
import { ResultKeywordsModule } from '../result-keywords/result-keywords.module';
import { ResultLeversModule } from '../result-levers/result-levers.module';
import { ResultContractsModule } from '../result-contracts/result-contracts.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultCapacitySharingModule } from '../result-capacity-sharing/result-capacity-sharing.module';
import { ResultPolicyChangeModule } from '../result-policy-change/result-policy-change.module';
import { AiRoarMiningApp } from '../../tools/broker/ai-roar-mining.app';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { ReportYearModule } from '../report-year/report-year.module';
import { ResultRegionsModule } from '../result-regions/result-regions.module';
import { ResultCountriesSubNationalsModule } from '../result-countries-sub-nationals/result-countries-sub-nationals.module';
import { ResultCountriesModule } from '../result-countries/result-countries.module';
import { ClarisaGeoScopeModule } from '../../tools/clarisa/entities/clarisa-geo-scope/clarisa-geo-scope.module';
import { ResultOpenSearchModule } from '../../tools/open-search/results/result.opensearch.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { SessionFormatsModule } from '../session-formats/session-formats.module';
import { SessionLengthsModule } from '../session-lengths/session-lengths.module';
import { SessionPurposesModule } from '../session-purposes/session-purposes.module';
import { SessionTypesModule } from '../session-types/session-types.module';
import { DeliveryModalitiesModule } from '../delivery-modalities/delivery-modalities.module';
import { ClarisaSubNationalsModule } from '../../tools/clarisa/entities/clarisa-sub-nationals/clarisa-sub-nationals.module';
import { ResultCapSharingIpModule } from '../result-cap-sharing-ip/result-cap-sharing-ip.module';
import { AllianceUserStaffModule } from '../alliance-user-staff/alliance-user-staff.module';
import { ClarisaLeversModule } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.module';
import { AgressoContractModule } from '../agresso-contract/agresso-contract.module';
import { ResultInnovationDevModule } from '../result-innovation-dev/result-innovation-dev.module';
import { ResultSdgsModule } from '../result-sdgs/result-sdgs.module';
import { ResultIpRightsModule } from '../result-ip-rights/result-ip-rights.module';

@Module({
  controllers: [ResultsController],
  imports: [
    ResultKeywordsModule,
    ResultLeversModule,
    ResultContractsModule,
    ResultKeywordsModule,
    ResultUsersModule,
    ResultCapacitySharingModule,
    ResultPolicyChangeModule,
    ReportYearModule,
    ResultRegionsModule,
    ResultCountriesModule,
    ResultCountriesSubNationalsModule,
    ClarisaGeoScopeModule,
    ResultOpenSearchModule,
    IndicatorsModule,
    SessionFormatsModule,
    SessionLengthsModule,
    SessionPurposesModule,
    SessionTypesModule,
    DeliveryModalitiesModule,
    ClarisaSubNationalsModule,
    ResultCapSharingIpModule,
    AllianceUserStaffModule,
    ClarisaLeversModule,
    AgressoContractModule,
    ResultInnovationDevModule,
    ResultSdgsModule,
    ResultIpRightsModule,
  ],
  providers: [
    ResultsService,
    ResultRepository,
    AiRoarMiningApp,
    AlianceManagementApp,
  ],
  exports: [ResultsService, ResultRepository],
})
export class ResultsModule {}
