import { Module } from '@nestjs/common';
import { CountryRolesService } from './country-roles.service';
import { CountryRolesController } from './country-roles.controller';

@Module({
  controllers: [CountryRolesController],
  providers: [CountryRolesService],
})
export class CountryRolesModule {}
