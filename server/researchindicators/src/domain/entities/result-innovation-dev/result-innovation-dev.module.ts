import { Module } from '@nestjs/common';
import { ResultInnovationDevService } from './result-innovation-dev.service';
import { ResultInnovationDevController } from './result-innovation-dev.controller';
import { ResultActorsModule } from '../result-actors/result-actors.module';
import { ResultInstitutionTypesModule } from '../result-institution-types/result-institution-types.module';
import { ClarisaActorTypesModule } from '../../tools/clarisa/entities/clarisa-actor-types/clarisa-actor-types.module';
import { LinkResultsModule } from '../link-results/link-results.module';
import { ClarisaInnovationCharacteristicsModule } from '../../tools/clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.module';
import { ClarisaInnovationTypesModule } from '../../tools/clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.module';
import { ClarisaInnovationReadinessLevelsModule } from '../../tools/clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { InnovationDevAnticipatedUsersModule } from '../innovation-dev-anticipated-users/innovation-dev-anticipated-users.module';
import { ClarisaInstitutionsModule } from '../../tools/clarisa/entities/clarisa-institutions/clarisa-institutions.module';
import { ClarisaInstitutionTypesModule } from '../../tools/clarisa/entities/clarisa-institution-types/clarisa-institution-types.module';

@Module({
  controllers: [ResultInnovationDevController],
  providers: [ResultInnovationDevService],
  exports: [ResultInnovationDevService],
  imports: [
    ResultActorsModule,
    ResultInstitutionTypesModule,
    ClarisaActorTypesModule,
    LinkResultsModule,
    ClarisaInnovationCharacteristicsModule,
    ClarisaInnovationTypesModule,
    ClarisaInnovationReadinessLevelsModule,
    InnovationDevAnticipatedUsersModule,
    ClarisaInstitutionsModule,
    ClarisaInstitutionTypesModule,
  ],
})
export class ResultInnovationDevModule {}
