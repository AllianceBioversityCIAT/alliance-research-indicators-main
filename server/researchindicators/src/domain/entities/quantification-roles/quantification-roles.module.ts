import { Module } from '@nestjs/common';
import { QuantificationRolesService } from './quantification-roles.service';
import { QuantificationRolesController } from './quantification-roles.controller';

@Module({
  controllers: [QuantificationRolesController],
  providers: [QuantificationRolesService],
  exports: [QuantificationRolesService],
})
export class QuantificationRolesModule {}
