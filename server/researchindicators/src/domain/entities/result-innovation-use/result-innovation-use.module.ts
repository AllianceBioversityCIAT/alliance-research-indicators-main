import { forwardRef, Module } from '@nestjs/common';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { ResultInnovationUseController } from './result-innovation-use.controller';
import { ResultActorsModule } from '../result-actors/result-actors.module';
import { ResultInstitutionTypesModule } from '../result-institution-types/result-institution-types.module';
import { ResultQuantificationsModule } from '../result-quantifications/result-quantifications.module';
import { LinkResultsModule } from '../link-results/link-results.module';
import { ResultsModule } from '../results/results.module';

@Module({
  controllers: [ResultInnovationUseController],
  providers: [ResultInnovationUseService],
  exports: [ResultInnovationUseService],
  imports: [
    ResultActorsModule,
    ResultInstitutionTypesModule,
    ResultQuantificationsModule,
    LinkResultsModule,
    forwardRef(() => ResultsModule),
  ],
})
export class ResultInnovationUseModule {}
