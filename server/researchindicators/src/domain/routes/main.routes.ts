import { Routes } from '@nestjs/core';
import { ResultsModule } from '../entities/results/results.module';
import { AgressoContractModule } from '../entities/agresso-contract/agresso-contract.module';
import { AgressoContractCountriesModule } from '../entities/agresso-contract-countries/agresso-contract-countries.module';
import { UserAgressoContractsModule } from '../entities/user-agresso-contracts/user-agresso-contracts.module';
import { clarisaRoutes } from '../tools/clarisa/routes/clarisa.routes';
import { ResultInstitutionsModule } from '../entities/result-institutions/result-institutions.module';
import { ResultEvidencesModule } from '../entities/result-evidences/result-evidences.module';
import { ResultCapacitySharingModule } from '../entities/result-capacity-sharing/result-capacity-sharing.module';
import { IndicatorsModule } from '../entities/indicators/indicators.module';
import { IndicatorTypesModule } from '../entities/indicator-types/indicator-types.module';
import { AgressoModule } from '../tools/agresso/agresso.module';
import { ClarisaModule } from '../tools/clarisa/clarisa.module';
import { ResultPolicyChangeModule } from '../entities/result-policy-change/result-policy-change.module';
import { SessionFormatsModule } from '../entities/session-formats/session-formats.module';
import { SessionTypesModule } from '../entities/session-types/session-types.module';
import { SessionLengthsModule } from '../entities/session-lengths/session-lengths.module';
import { SessionPurposesModule } from '../entities/session-purposes/session-purposes.module';
import { DegreesModule } from '../entities/degrees/degrees.module';
import { DeliveryModalitiesModule } from '../entities/delivery-modalities/delivery-modalities.module';
import { GendersModule } from '../entities/genders/genders.module';

const ResultsChildren: Routes = [
  {
    path: 'institutions',
    module: ResultInstitutionsModule,
  },
  {
    path: 'evidences',
    module: ResultEvidencesModule,
  },
  {
    path: 'capacity-sharing',
    module: ResultCapacitySharingModule,
  },
  {
    path: 'policy-change',
    module: ResultPolicyChangeModule,
  },
];

const sessionChildren: Routes = [
  {
    path: 'format',
    module: SessionFormatsModule,
  },
  {
    path: 'type',
    module: SessionTypesModule,
  },
  {
    path: 'length',
    module: SessionLengthsModule,
  },
  {
    path: 'purpose',
    module: SessionPurposesModule,
  },
];

const children: Routes = [
  {
    path: 'results',
    children: ResultsChildren,
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
  {
    path: 'user-agresso-contracts',
    module: UserAgressoContractsModule,
  },
  {
    path: 'indicators',
    module: IndicatorsModule,
  },
  {
    path: 'indicator-types',
    module: IndicatorTypesModule,
  },
  {
    path: 'clarisa',
    module: ClarisaModule,
    children: clarisaRoutes,
  },
  {
    path: 'agresso',
    module: AgressoModule,
  },
  {
    path: 'session',
    children: sessionChildren,
  },
  {
    path: 'degree',
    module: DegreesModule,
  },
  {
    path: 'delivery-modalities',
    module: DeliveryModalitiesModule,
  },
  {
    path: 'gender',
    module: GendersModule,
  },
];

export const route: Routes = [
  {
    path: 'api',
    children: children,
  },
];
