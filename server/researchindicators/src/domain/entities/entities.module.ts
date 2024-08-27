import { Module } from '@nestjs/common';
import { AgressoContractModule } from './agresso-contract/agresso-contract.module';
import { AgressoContractCountriesModule } from './agresso-contract-countries/agresso-contract-countries.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [
    AgressoContractModule,
    AgressoContractCountriesModule,
    ResultsModule,
  ],
  exports: [AgressoContractModule],
})
export class EntitiesModule {}
