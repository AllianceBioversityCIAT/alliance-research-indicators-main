import { Module } from '@nestjs/common';
import { ContractRolesService } from './contract-roles.service';
import { ContractRolesController } from './contract-roles.controller';

@Module({
  controllers: [ContractRolesController],
  providers: [ContractRolesService],
})
export class ContractRolesModule {}
