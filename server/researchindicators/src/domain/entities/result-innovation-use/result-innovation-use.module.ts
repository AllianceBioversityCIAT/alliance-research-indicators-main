import { Module } from '@nestjs/common';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { ResultInnovationUseController } from './result-innovation-use.controller';
import { ResultActorsModule } from '../result-actors/result-actors.module';
import { ResultInstitutionTypesModule } from '../result-institution-types/result-institution-types.module';
import { ResultQuantificationsModule } from '../result-quantifications/result-quantifications.module';

@Module({
  controllers: [ResultInnovationUseController],
  providers: [ResultInnovationUseService],
  exports: [ResultInnovationUseService],
  imports: [
    ResultActorsModule,
    ResultInstitutionTypesModule,
    ResultQuantificationsModule,
  ],
})
export class ResultInnovationUseModule {}
