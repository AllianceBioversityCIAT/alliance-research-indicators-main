import { Module } from '@nestjs/common';
import { InstitutionTypeRolesService } from './institution-type-roles.service';
import { InstitutionTypeRolesController } from './institution-type-roles.controller';

@Module({
  controllers: [InstitutionTypeRolesController],
  providers: [InstitutionTypeRolesService],
})
export class InstitutionTypeRolesModule {}
