import { Module } from '@nestjs/common';
import { InformativeRolesService } from './informative-roles.service';
import { InformativeRolesController } from './informative-roles.controller';

@Module({
  controllers: [InformativeRolesController],
  providers: [InformativeRolesService],
  exports: [InformativeRolesService],
})
export class InformativeRolesModule {}
