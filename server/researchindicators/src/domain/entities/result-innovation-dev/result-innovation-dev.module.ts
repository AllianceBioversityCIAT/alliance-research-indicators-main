import { Module } from '@nestjs/common';
import { ResultInnovationDevService } from './result-innovation-dev.service';
import { ResultInnovationDevController } from './result-innovation-dev.controller';
import { ResultActorsModule } from '../result-actors/result-actors.module';
import { ResultInstitutionTypesModule } from '../result-institution-types/result-institution-types.module';
import { ClarisaActorTypesModule } from '../../tools/clarisa/entities/clarisa-actor-types/clarisa-actor-types.module';
import { LinkResultsModule } from '../link-results/link-results.module';

@Module({
  controllers: [ResultInnovationDevController],
  providers: [ResultInnovationDevService],
  exports: [ResultInnovationDevService],
  imports: [
    ResultActorsModule,
    ResultInstitutionTypesModule,
    ClarisaActorTypesModule,
    LinkResultsModule,
  ],
})
export class ResultInnovationDevModule {}
