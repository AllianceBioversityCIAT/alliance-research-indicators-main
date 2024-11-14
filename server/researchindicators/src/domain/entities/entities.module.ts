import { Module } from '@nestjs/common';
import { AgressoContractModule } from './agresso-contract/agresso-contract.module';
import { AgressoContractCountriesModule } from './agresso-contract-countries/agresso-contract-countries.module';
import { ResultsModule } from './results/results.module';
import { UserAgressoContractsModule } from './user-agresso-contracts/user-agresso-contracts.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { ResultContractsModule } from './result-contracts/result-contracts.module';
import { ContractRolesModule } from './contract-roles/contract-roles.module';
import { ResultLeversModule } from './result-levers/result-levers.module';
import { LeverRolesModule } from './lever-roles/lever-roles.module';
import { ResultKeywordsModule } from './result-keywords/result-keywords.module';
import { CountryRolesModule } from './country-roles/country-roles.module';
import { ResultCountriesModule } from './result-countries/result-countries.module';
import { ResultRegionsModule } from './result-regions/result-regions.module';
import { ResultCountriesSubNationalsModule } from './result-countries-sub-nationals/result-countries-sub-nationals.module';
import { ResultCapacitySharingModule } from './result-capacity-sharing/result-capacity-sharing.module';
import { SessionPurposesModule } from './session-purposes/session-purposes.module';
import { SessionFormatsModule } from './session-formats/session-formats.module';
import { SessionTypesModule } from './session-types/session-types.module';
import { DegreesModule } from './degrees/degrees.module';
import { GendersModule } from './genders/genders.module';
import { SessionLengthsModule } from './session-lengths/session-lengths.module';
import { DeliveryModalitiesModule } from './delivery-modalities/delivery-modalities.module';
import { ResultEvidencesModule } from './result-evidences/result-evidences.module';
import { EvidenceRolesModule } from './evidence-roles/evidence-roles.module';
import { ResultLanguagesModule } from './result-languages/result-languages.module';
import { ResultInstitutionsModule } from './result-institutions/result-institutions.module';
import { ResultUsersModule } from './result-users/result-users.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { IndicatorTypesModule } from './indicator-types/indicator-types.module';
import { InstitutionRolesModule } from './institution-roles/institution-roles.module';
import { LanguageRolesModule } from './language-roles/language-roles.module';
import { ResultPolicyChangeModule } from './result-policy-change/result-policy-change.module';
import { PolicyTypesModule } from './policy-types/policy-types.module';
import { PolicyStagesModule } from './policy-stages/policy-stages.module';
import { LinkResultsModule } from './link-results/link-results.module';
import { LinkResultRolesModule } from './link-result-roles/link-result-roles.module';
import { AllianceUserStaffModule } from './alliance-user-staff/alliance-user-staff.module';
import { ResultStatusModule } from './result-status/result-status.module';

@Module({
  imports: [
    AgressoContractModule,
    AgressoContractCountriesModule,
    ResultsModule,
    UserAgressoContractsModule,
    IndicatorsModule,
    ResultContractsModule,
    ContractRolesModule,
    ResultLeversModule,
    LeverRolesModule,
    ResultKeywordsModule,
    CountryRolesModule,
    ResultCountriesModule,
    ResultRegionsModule,
    ResultCountriesSubNationalsModule,
    ResultCapacitySharingModule,
    SessionPurposesModule,
    SessionFormatsModule,
    SessionTypesModule,
    DegreesModule,
    GendersModule,
    SessionLengthsModule,
    DeliveryModalitiesModule,
    ResultEvidencesModule,
    EvidenceRolesModule,
    ResultLanguagesModule,
    ResultInstitutionsModule,
    ResultUsersModule,
    UserRolesModule,
    IndicatorTypesModule,
    InstitutionRolesModule,
    LanguageRolesModule,
    ResultPolicyChangeModule,
    PolicyTypesModule,
    PolicyStagesModule,
    LinkResultsModule,
    LinkResultRolesModule,
    AllianceUserStaffModule,
    ResultStatusModule,
  ],
  exports: [AgressoContractModule],
})
export class EntitiesModule {}
