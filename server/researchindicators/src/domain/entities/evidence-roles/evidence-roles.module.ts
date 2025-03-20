import { Module } from '@nestjs/common';
import { EvidenceRolesService } from './evidence-roles.service';
import { EvidenceRolesController } from './evidence-roles.controller';

@Module({
  controllers: [EvidenceRolesController],
  providers: [EvidenceRolesService],
})
export class EvidenceRolesModule {}
