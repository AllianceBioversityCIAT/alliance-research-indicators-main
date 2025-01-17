import { Routes } from '@nestjs/core';
import { ResultOpenSearchModule } from './results/result.opensearch.module';

export const openSearchRoutes: Routes = [
  {
    path: 'result',
    module: ResultOpenSearchModule,
  },
];
