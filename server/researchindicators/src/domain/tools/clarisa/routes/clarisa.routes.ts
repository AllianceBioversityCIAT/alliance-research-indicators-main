import { Routes } from '@nestjs/core';
import { ClarisaCountriesModule } from '../entities/clarisa-countries/clarisa-countries.module';
import { ClarisaGeoScopeModule } from '../entities/clarisa-geo-scope/clarisa-geo-scope.module';
import { ClarisaInstitutionTypesModule } from '../entities/clarisa-institution-types/clarisa-institution-types.module';
import { ClarisaInstitutionsModule } from '../entities/clarisa-institutions/clarisa-institutions.module';
import { ClarisaLanguagesModule } from '../entities/clarisa-languages/clarisa-languages.module';
import { ClarisaRegionsModule } from '../entities/clarisa-regions/clarisa-regions.module';
import { ClarisaSubNationalsModule } from '../entities/clarisa-sub-nationals/clarisa-sub-nationals.module';
import { ClarisaModule } from '../clarisa.module';
import { ClarisaLeversModule } from '../entities/clarisa-levers/clarisa-levers.module';
import { ClarisaInnovationReadinessLevelsModule } from '../entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaInnovationTypesModule } from '../entities/clarisa-innovation-types/clarisa-innovation-types.module';
import { ClarisaInnovationCharacteristicsModule } from '../entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.module';

export const clarisaRoutes: Routes = [
  {
    path: 'countries',
    module: ClarisaCountriesModule,
  },
  {
    path: 'geo-scope',
    module: ClarisaGeoScopeModule,
  },
  {
    path: 'institutions-types',
    module: ClarisaInstitutionTypesModule,
  },
  {
    path: 'institutions',
    module: ClarisaInstitutionsModule,
  },
  {
    path: 'languages',
    module: ClarisaLanguagesModule,
  },
  {
    path: 'regions',
    module: ClarisaRegionsModule,
  },
  {
    path: 'sub-nationals',
    module: ClarisaSubNationalsModule,
  },
  {
    path: 'manager',
    module: ClarisaModule,
  },
  {
    path: 'levers',
    module: ClarisaLeversModule,
  },
  {
    path: 'innovation-readiness-levels',
    module: ClarisaInnovationReadinessLevelsModule,
  },
  {
    path: 'innovation-types',
    module: ClarisaInnovationTypesModule,
  },
  {
    path: 'innovation-characteristics',
    module: ClarisaInnovationCharacteristicsModule,
  },
];
