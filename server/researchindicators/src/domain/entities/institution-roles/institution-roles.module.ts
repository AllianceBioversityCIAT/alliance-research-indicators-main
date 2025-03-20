import { Module } from '@nestjs/common';
import { InstitutionRolesService } from './institution-roles.service';
import { InstitutionRolesController } from './institution-roles.controller';

@Module({
  controllers: [InstitutionRolesController],
  providers: [InstitutionRolesService],
})
export class InstitutionRolesModule {}
