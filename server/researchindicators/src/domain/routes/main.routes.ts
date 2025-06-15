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
import { AgressoToolsModule } from '../tools/agresso/agresso-tools.module';
import { ClarisaModule } from '../tools/clarisa/clarisa.module';
import { ResultPolicyChangeModule } from '../entities/result-policy-change/result-policy-change.module';
import { SessionFormatsModule } from '../entities/session-formats/session-formats.module';
import { SessionTypesModule } from '../entities/session-types/session-types.module';
import { SessionLengthsModule } from '../entities/session-lengths/session-lengths.module';
import { SessionPurposesModule } from '../entities/session-purposes/session-purposes.module';
import { DegreesModule } from '../entities/degrees/degrees.module';
import { DeliveryModalitiesModule } from '../entities/delivery-modalities/delivery-modalities.module';
import { GendersModule } from '../entities/genders/genders.module';
import { ResultStatusModule } from '../entities/result-status/result-status.module';
import { AllianceUserStaffModule } from '../entities/alliance-user-staff/alliance-user-staff.module';
import { ResultContractsModule } from '../entities/result-contracts/result-contracts.module';
import { AgressoStaffModule } from '../tools/agresso/staff/agresso-staff-tools.module';
import { ConnectionsModule } from '../entities/connections/connections.module';
import { openSearchRoutes } from '../tools/open-search/opensearch.routes';
import { AnnouncementSettingsModule } from '../entities/announcement-settings/announcement-settings.module';
import { ReportYearModule } from '../entities/report-year/report-year.module';
import { GreenChecksModule } from '../entities/green-checks/green-checks.module';
import { IntellectualPropertyOwnersModule } from '../entities/intellectual-property-owners/intellectual-property-owners.module';
import { ResultCapSharingIpModule } from '../entities/result-cap-sharing-ip/result-cap-sharing-ip.module';
import { ReportingFeedbackModule } from '../entities/reporting-feedback/reporting-feedback.module';
import { ResultInnovationDevModule } from '../entities/result-innovation-dev/result-innovation-dev.module';
import { InnovationDevAnticipatedUsersModule } from '../entities/innovation-dev-anticipated-users/innovation-dev-anticipated-users.module';
import { ResultActorsModule } from '../entities/result-actors/result-actors.module';
import { ActorRolesModule } from '../entities/actor-roles/actor-roles.module';
import { ResultInstitutionTypesModule } from '../entities/result-institution-types/result-institution-types.module';
import { InstitutionTypeRolesModule } from '../entities/institution-type-roles/institution-type-roles.module';

const capSharingChildren: Routes = [
  {
    path: 'ip-owners',
    module: IntellectualPropertyOwnersModule,
  },
  {
    path: 'ip',
    module: ResultCapSharingIpModule,
  },
];

const ResultsChildren: Routes = [
  {
    path: 'institutions',
    module: ResultInstitutionsModule,
  },
  {
    path: 'innovation-dev',
    module: ResultInnovationDevModule,
    children: [
      {
        path: 'anticipated-users',
        module: InnovationDevAnticipatedUsersModule,
      },
    ],
  },
  {
    path: 'evidences',
    module: ResultEvidencesModule,
  },
  {
    path: 'capacity-sharing',
    module: ResultCapacitySharingModule,
    children: capSharingChildren,
  },
  {
    path: 'policy-change',
    module: ResultPolicyChangeModule,
  },
  {
    path: 'status',
    module: ResultStatusModule,
  },
  {
    path: 'alliance-user-staff',
    module: AllianceUserStaffModule,
  },
  {
    path: 'contracts',
    module: ResultContractsModule,
  },
  {
    path: 'year',
    module: ReportYearModule,
  },
  {
    path: 'green-checks',
    module: GreenChecksModule,
  },
  {
    path: 'actors',
    module: ResultActorsModule,
    children: [
      {
        path: 'roles',
        module: ActorRolesModule,
      },
    ],
  },
  {
    path: 'institution-types',
    module: ResultInstitutionTypesModule,
    children: [
      {
        path: 'roles',
        module: InstitutionTypeRolesModule,
      },
    ],
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

const agressiChildren: Routes = [
  {
    path: 'contracts',
    module: AgressoContractModule,
  },
  {
    path: 'staff',
    module: AllianceUserStaffModule,
  },
];

const agressotoolsChildren: Routes = [
  {
    path: 'staff',
    module: AgressoStaffModule,
  },
  {
    path: 'contracts',
    module: AgressoToolsModule,
  },
];

const toolsChildren: Routes = [
  {
    path: 'clarisa',
    module: ClarisaModule,
    children: clarisaRoutes,
  },
  {
    path: 'agresso',
    children: agressotoolsChildren,
  },
];

const children: Routes = [
  {
    path: 'results',
    children: ResultsChildren,
    module: ResultsModule,
  },
  {
    path: 'agresso',
    children: agressiChildren,
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
    path: 'tools',
    children: toolsChildren,
  },
  {
    path: 'connection',
    module: ConnectionsModule,
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
  {
    path: 'opensearch',
    children: openSearchRoutes,
  },
  {
    path: 'announcement-setting',
    module: AnnouncementSettingsModule,
  },
  {
    path: 'reporting-feedback',
    module: ReportingFeedbackModule,
  },
];

export const route: Routes = [
  {
    path: 'api',
    children: children,
  },
];
