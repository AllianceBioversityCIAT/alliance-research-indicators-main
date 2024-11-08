import { Module } from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { ResultPolicyChangeController } from './result-policy-change.controller';
import { LinkResultsModule } from '../link-results/link-results.module';
import { ResultInstitutionsModule } from '../result-institutions/result-institutions.module';

@Module({
  controllers: [ResultPolicyChangeController],
  providers: [ResultPolicyChangeService],
  imports: [LinkResultsModule, ResultInstitutionsModule],
})
export class ResultPolicyChangeModule {}
