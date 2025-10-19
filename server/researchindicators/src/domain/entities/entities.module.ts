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
import { ReportYearModule } from './report-year/report-year.module';
import { ConnectionsModule } from './connections/connections.module';
import { AnnouncementSettingsModule } from './announcement-settings/announcement-settings.module';
import { GreenChecksModule } from './green-checks/green-checks.module';
import { ResultCapSharingIpModule } from './result-cap-sharing-ip/result-cap-sharing-ip.module';
import { IntellectualPropertyOwnersModule } from './intellectual-property-owners/intellectual-property-owners.module';
import { ReportingFeedbackModule } from './reporting-feedback/reporting-feedback.module';
import { ResultInnovationDevModule } from './result-innovation-dev/result-innovation-dev.module';
import { InnovationDevAnticipatedUsersModule } from './innovation-dev-anticipated-users/innovation-dev-anticipated-users.module';
import { ResultActorsModule } from './result-actors/result-actors.module';
import { ActorRolesModule } from './actor-roles/actor-roles.module';
import { ResultInstitutionTypesModule } from './result-institution-types/result-institution-types.module';
import { InstitutionTypeRolesModule } from './institution-type-roles/institution-type-roles.module';
import { IssueCategoriesModule } from './issue-categories/issue-categories.module';
import { ResultSdgsModule } from './result-sdgs/result-sdgs.module';
import { AppConfigModule } from './app-config/app-config.module';
import { DisseminationQualificationsModule } from './dissemination-qualifications/dissemination-qualifications.module';
import { ToolFunctionsModule } from './tool-functions/tool-functions.module';
import { ExpansionPotentialsModule } from './expansion-potentials/expansion-potentials.module';
import { ResultIpRightsModule } from './result-ip-rights/result-ip-rights.module';
import { IpRightsApplicationOptionsModule } from './ip-rights-application-options/ip-rights-application-options.module';
import { AppSecretsModule } from './app-secrets/app-secrets.module';
import { AppSecretHostListModule } from './app-secret-host-list/app-secret-host-list.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { SettingKeysModule } from './setting-keys/setting-keys.module';
import { ResultOicrModule } from './result-oicr/result-oicr.module';
import { ResultTagsModule } from './result-tags/result-tags.module';
import { TagsModule } from './tags/tags.module';
import { ResultInitiativesModule } from './result-initiatives/result-initiatives.module';
import { TempExternalOicrsModule } from './temp_external_oicrs/temp_external_oicrs.module';
import { MaturityLevelModule } from './maturity-level/maturity-level.module';
import { ResultInnovationToolFunctionModule } from './result-innovation-tool-function/result-innovation-tool-function.module';
import { AllianceUserStaffGroupsModule } from './alliance-user-staff-groups/alliance-user-staff-groups.module';
import { StaffGroupsModule } from './staff-groups/staff-groups.module';
import { ResultLeverStrategicOutcomeModule } from './result-lever-strategic-outcome/result-lever-strategic-outcome.module';
import { LeverStrategicOutcomeModule } from './lever-strategic-outcome/lever-strategic-outcome.module';
import { ResultQuantificationsModule } from './result-quantifications/result-quantifications.module';
import { QuantificationRolesModule } from './quantification-roles/quantification-roles.module';
import { ResultNotableReferencesModule } from './result-notable-references/result-notable-references.module';
import { NotableReferenceTypesModule } from './notable-reference-types/notable-reference-types.module';
import { InformativeRolesModule } from './informative-roles/informative-roles.module';
import { ResultImpactAreasModule } from './result-impact-areas/result-impact-areas.module';
import { ImpactAreaScoreModule } from './impact-area-score/impact-area-score.module';

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
    ReportYearModule,
    ConnectionsModule,
    AnnouncementSettingsModule,
    GreenChecksModule,
    ResultCapSharingIpModule,
    IntellectualPropertyOwnersModule,
    ReportingFeedbackModule,
    ResultInnovationDevModule,
    InnovationDevAnticipatedUsersModule,
    ResultActorsModule,
    ActorRolesModule,
    ResultInstitutionTypesModule,
    InstitutionTypeRolesModule,
    IssueCategoriesModule,
    ResultSdgsModule,
    AppConfigModule,
    DisseminationQualificationsModule,
    ToolFunctionsModule,
    ExpansionPotentialsModule,
    ResultIpRightsModule,
    IpRightsApplicationOptionsModule,
    AppSecretsModule,
    AppSecretHostListModule,
    UserSettingsModule,
    SettingKeysModule,
    ResultOicrModule,
    ResultTagsModule,
    TagsModule,
    ResultInitiativesModule,
    TempExternalOicrsModule,
    MaturityLevelModule,
    ResultInnovationToolFunctionModule,
    AllianceUserStaffGroupsModule,
    StaffGroupsModule,
    ResultLeverStrategicOutcomeModule,
    LeverStrategicOutcomeModule,
    ResultQuantificationsModule,
    QuantificationRolesModule,
    ResultNotableReferencesModule,
    NotableReferenceTypesModule,
    InformativeRolesModule,
    ResultImpactAreasModule,
    ImpactAreaScoreModule,
  ],
  exports: [AgressoContractModule, AppSecretsModule],
})
export class EntitiesModule {}
