import { Module } from '@nestjs/common';
import { AgressoContractModule } from './agresso-contract/agresso-contract.module';
import { AgressoContractCountriesModule } from './agresso-contract-countries/agresso-contract-countries.module';

@Module({
  imports: [AgressoContractModule, AgressoContractCountriesModule],
  exports: [AgressoContractModule],
})
export class EntitiesModule {}
