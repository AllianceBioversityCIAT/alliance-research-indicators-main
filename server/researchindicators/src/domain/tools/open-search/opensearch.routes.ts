import { Routes } from '@nestjs/core';
import { ResultOpenSearchModule } from './results/result.opensearch.module';
import { AllianceStaffOpenSearchModule } from './alliance-staff/alliance-staff.opensearch.module';
import { PrmsOpenSearchModule } from './prms/prms.opensearch.module';

export const openSearchRoutes: Routes = [
  {
    path: 'result',
    module: ResultOpenSearchModule,
  },
  {
    path: 'alliance-staff',
    module: AllianceStaffOpenSearchModule,
  },
  {
    path: 'prms',
    module: PrmsOpenSearchModule,
  },
];
