import { Routes } from '@nestjs/core';
import { ResultsModule } from '../entities/results/results.module';
import { AgressoContractModule } from '../entities/agresso-contract/agresso-contract.module';
import { AgressoContractCountriesModule } from '../entities/agresso-contract-countries/agresso-contract-countries.module';

const children: Routes = [
  {
    path: 'results',
    module: ResultsModule,
  },
  {
    path: 'agresso-contract',
    module: AgressoContractModule,
  },
  {
    path: 'agresso-contract-countries',
    module: AgressoContractCountriesModule,
  },
];

export const route: Routes = [
  {
    path: 'api',
    children: children,
  },
];
