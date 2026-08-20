import { Module } from '@nestjs/common';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { HttpModule } from '@nestjs/axios';
import { ResultsModule } from '../../../entities/results/results.module';
import { ResultKnowledgeProductModule } from '../../../entities/result-knowledge-product/result-knowledge-product.module';
import { PooledFundingContractsModule } from '../../../entities/pooled-funding-contracts/pooled-funding-contracts.module';
import { ClarisaLeversModule } from '../../clarisa/entities/clarisa-levers/clarisa-levers.module';
import { SyncProcessLogModule } from '../../../entities/sync-process-log/sync-process-log.module';
import { PrmsRepository } from './repositories/prms.repository';
import { ClarisaCountriesModule } from '../../clarisa/entities/clarisa-countries/clarisa-countries.module';
import { ClarisaRegionsModule } from '../../clarisa/entities/clarisa-regions/clarisa-regions.module';
import { ClarisaInstitutionsModule } from '../../clarisa/entities/clarisa-institutions/clarisa-institutions.module';
import { SaveAllSectionsModule } from '../../../shared/services/save-all-sections.module';
import { ClarisaInnovationCharacteristicsModule } from '../../clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.module';
import { ClarisaInnovationTypesModule } from '../../clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.module';
import { ClarisaInnovationReadinessLevelsModule } from '../../clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaActorTypesModule } from '../../clarisa/entities/clarisa-actor-types/clarisa-actor-types.module';
import { ClarisaInstitutionTypesModule } from '../../clarisa/entities/clarisa-institution-types/clarisa-institution-types.module';

@Module({
  controllers: [PrmsOpenSearchController],
  providers: [PrmsOpenSearchService, PrmsRepository],
  exports: [PrmsOpenSearchService, PrmsRepository],
  imports: [
    HttpModule,
    ResultsModule,
    ResultKnowledgeProductModule,
    PooledFundingContractsModule,
    ClarisaLeversModule,
    SyncProcessLogModule,
    ClarisaCountriesModule,
    ClarisaRegionsModule,
    ClarisaInstitutionsModule,
    ClarisaInnovationCharacteristicsModule,
    ClarisaInnovationTypesModule,
    ClarisaInnovationReadinessLevelsModule,
    ClarisaActorTypesModule,
    ClarisaInstitutionTypesModule,
    SaveAllSectionsModule,
  ],
})
export class PrmsOpenSearchModule {}
