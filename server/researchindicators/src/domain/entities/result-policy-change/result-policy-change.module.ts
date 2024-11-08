import { Module } from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { ResultPolicyChangeController } from './result-policy-change.controller';
import { LinkResultRolesModule } from '../link-result-roles/link-result-roles.module';

@Module({
  controllers: [ResultPolicyChangeController],
  providers: [ResultPolicyChangeService],
  imports: [LinkResultRolesModule],
})
export class ResultPolicyChangeModule {}
