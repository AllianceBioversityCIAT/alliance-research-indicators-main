import { Module } from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { ResultPolicyChangeController } from './result-policy-change.controller';
import { LinkResultsModule } from '../link-results/link-results.module';
import { ResultInstitutionsModule } from '../result-institutions/result-institutions.module';
import { PolicyStagesModule } from '../policy-stages/policy-stages.module';
import { PolicyTypesModule } from '../policy-types/policy-types.module';

@Module({
  controllers: [ResultPolicyChangeController],
  providers: [ResultPolicyChangeService],
  imports: [
    LinkResultsModule,
    ResultInstitutionsModule,
    PolicyStagesModule,
    PolicyTypesModule,
  ],
  exports: [ResultPolicyChangeService],
})
export class ResultPolicyChangeModule {}
