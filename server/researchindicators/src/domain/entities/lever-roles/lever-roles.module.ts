import { Module } from '@nestjs/common';
import { LeverRolesService } from './lever-roles.service';
import { LeverRolesController } from './lever-roles.controller';

@Module({
  controllers: [LeverRolesController],
  providers: [LeverRolesService],
})
export class LeverRolesModule {}
