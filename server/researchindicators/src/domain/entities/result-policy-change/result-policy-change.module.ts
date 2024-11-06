import { Module } from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { ResultPolicyChangeController } from './result-policy-change.controller';

@Module({
  controllers: [ResultPolicyChangeController],
  providers: [ResultPolicyChangeService],
})
export class ResultPolicyChangeModule {}
