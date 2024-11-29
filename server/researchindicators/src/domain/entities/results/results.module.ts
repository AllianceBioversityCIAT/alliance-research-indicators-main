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
