import { Module } from '@nestjs/common';
import { AgressoContractModule } from './agresso-contract/agresso-contract.module';
import { AgressoContractCountriesModule } from './agresso-contract-countries/agresso-contract-countries.module';
import { ResultsModule } from './results/results.module';
import { UserAgressoContractsModule } from './user-agresso-contracts/user-agresso-contracts.module';

@Module({
  imports: [
    AgressoContractModule,
    AgressoContractCountriesModule,
    ResultsModule,
    UserAgressoContractsModule,
  ],
  exports: [AgressoContractModule],
})
export class EntitiesModule {}
