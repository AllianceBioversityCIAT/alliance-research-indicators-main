import { Injectable, Injector, type InjectOptions, type ProviderToken } from '@angular/core';
import { GetContractsService } from './control-list/get-contracts.service';
import { GetInstitutionsService } from './control-list/get-institutions.service';
import { ControlListServices } from '../interfaces/services.interface';
import { GetUserStaffService } from './control-list/get-user-staff.service';
import { GetCountriesService } from './control-list/get-countries.service';
import { GetClarisaLanguagesService } from './control-list/get-clarisa-languages.service';
import { PolicyTypesService } from './short-control-list/policy-types.service';
import { PolicyStagesService } from './short-control-list/policy-stages.service';
import { CapSharingGendersService } from './short-control-list/cap-sharing-genders.service';
import { CapSharingFormatsService } from './short-control-list/cap-sharing-formats.service';
import { CapSharingTypesService } from './short-control-list/cap-sharing-types.service';
import { CapSharingDegreesService } from './short-control-list/cap-sharing-degrees.service';
import { CapSharingLengthsService } from './short-control-list/cap-sharing-lengths.service';
import { CapSharingDeliveryModalitiesService } from './short-control-list/cap-sharing-delivery-modalities.service';
import { CapSharingSessionPurposeService } from './short-control-list/cap-sharing-session-purpose.service';
import { YesOrNotService } from './short-control-list/yes-or-not.service';
import { GetGeoFocusService } from './control-list/get-geo-focus.service';
import { GetRegionsService } from './control-list/get-regions.service';
import { GetOsGeoScopeService } from './opensearch/get-os-geo-scope.service';
import { GetOsCountriesService } from './opensearch/get-os-countries.service';
import { GetOsResultService } from './opensearch/get-os-result.service';
import { GetInnoDevOutputService } from './control-list/get-innovation-dev-output.service';
import { GetInnoUseOutputService } from './control-list/get-innovation-use-output.service';
import { GetOsSubnationalService } from './opensearch/get-os-subnational.service';
import { GetAllIndicatorsService } from './control-list/get-all-indicators.service';
import { GetAllResultStatusService } from './control-list/get-all-result-status.service';
import { GetAllYearsService } from './control-list/get-all-years.service';
import { GetSubnationalByIsoAlphaService } from './get-subnational-by-iso-alpha.service';
import { GetClarisaInstitutionsTypesChildlessService } from './get-clarisa-institutions-type-childless.service';
import { GetClarisaInstitutionsTypesService } from './get-clarisa-institutions-type.service';
import { IpOwnerService } from './short-control-list/ip-owner.service';
import { GetYearsService } from './control-list/get-years.service';
import { GetYearsByCodeService } from './control-list/get-years-by-code.service';
import { GetInnovationTypesService } from './control-list/get-innovation-types.service';
import { GetInnovationCharacteristicsService } from './control-list/get-innovation-characteristics.service';
import { GetInnovationReadinessLevelsService } from './control-list/get-innovation-readiness-levels.service';
import { GetAnticipatedUsersService } from './short-control-list/get-anticipated-users.service';
import { GetActorTypesService } from './control-list/get-actor-types.service';
import { GetInstitutionTypesService } from './control-list/get-institution-types.service';
import { GetSdgsService } from './control-list/get-sdgs.service';
import { ScalingService } from './short-control-list/scaling.service';
import { DisseminationQualificationsService } from './short-control-list/dissemination-qualifications.service';
import { ToolFunctionsService } from './short-control-list/tool-functions.service';
import { ExpansionPotentialService } from './short-control-list/expansion-potential.service';
import { InnResultsService } from './short-control-list/inn-results.service';
import { ApplicationOptionsService } from './short-control-list/application-options.service';
import { GetLeversService } from './control-list/get-levers.service';
import { GetScienceProgramsService } from './control-list/get-science-programs.service';
import { GetBilateralScienceProgramsService } from './control-list/get-bilateral-science-programs.service';
import { GetStrategicObjectivesService } from './control-list/get-strategic-objectives.service';
import { GetImpactOutcomesService } from './control-list/get-impact-outcomes.service';
import { GetProjectStatusService } from './control-list/get-project-status.service';
import { GetFundingTypesService } from './control-list/get-funding-types.service';
import { GetInitiativesService } from './control-list/get-initiatives.service';
import { GetTagsService } from './control-list/get-tags.service';
import { OicrResultsService } from './short-control-list/oicr-results.service';
import { GetMaturityLevelsService } from './control-list/get-maturity-levels.service';
import { GetAllianceStaffByGroupService } from './control-list/get-alliance-staff-by-group.service';
import { GetLeverStrategicOutcomesService } from './control-list/get-lever-strategic-outcomes.service';
import { GetLeverSdgTargetsService } from './control-list/get-lever-sdg-targets.service';
import { NotableReferenceTypesService } from './short-control-list/notable-reference-types.service';
import { InformativeRolesService } from './short-control-list/informative-roles.service';
import { GlobalTargetsService } from './short-control-list/global-targets.service';
import { ImpactAreaScoresService } from './short-control-list/impact-area-scores.service';
import { ImpactAreasService } from './short-control-list/impact-areas.service';
import { SourceFilterOptionsService } from './short-control-list/source-filter-options.service';
import { GetClarisaSdgTargetsService } from './control-list/get-clarisa-sdg-targets.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceLocatorService {
  constructor(private readonly injector: Injector) {}

  private getFromInjector<T>(token: ProviderToken<T>): T {
    return this.injector.get(token, undefined, { optional: false } satisfies InjectOptions);
  }

  getService(serviceName: ControlListServices) {
    return (
      this.getPrimaryServices(serviceName) ??
      this.getSecondaryServices(serviceName) ??
      this.getTertiaryServices(serviceName) ??
      this.getQuaternaryServices(serviceName) ??
      this.getOtherServices(serviceName)
    );
  }

  clearService(serviceName: ControlListServices) {
    const service = this.getService(serviceName);
    if (service) {
      if (typeof (service as { list?: unknown }).list !== 'undefined') {
        (service as { list: { set: (v: unknown[]) => void } }).list.set([]);
      }
      if (typeof (service as { main?: () => void }).main === 'function') {
        (service as { main: () => void }).main();
      }
    }
  }

  private getPrimaryServices(serviceName: ControlListServices) {
    switch (serviceName) {
      case 'actorTypes':
        return this.getFromInjector(GetActorTypesService);
      case 'institutionTypes':
        return this.getFromInjector(GetInstitutionTypesService);
      case 'anticipatedUsers':
        return this.getFromInjector(GetAnticipatedUsersService);
      case 'innovationTypes':
        return this.getFromInjector(GetInnovationTypesService);
      case 'innovationCharacteristics':
        return this.getFromInjector(GetInnovationCharacteristicsService);
      case 'innovationReadinessLevels':
        return this.getFromInjector(GetInnovationReadinessLevelsService);
      case 'contracts':
        return this.getFromInjector(GetContractsService);
      case 'institutions':
        return this.getFromInjector(GetInstitutionsService);
      case 'userStaff':
        return this.getFromInjector(GetUserStaffService);
      case 'maturityLevels':
        return this.getFromInjector(GetMaturityLevelsService);
      case 'countriesWithSubnational': {
        const svc = this.getFromInjector(GetCountriesService);
        svc.main(true);
        return svc;
      }
      case 'countriesWithoutSubnational': {
        const svc = this.getFromInjector(GetCountriesService);
        svc.main(false);
        return svc;
      }
      default:
        return null;
    }
  }

  private getSecondaryServices(serviceName: ControlListServices) {
    switch (serviceName) {
      case 'countries':
        return this.getFromInjector(GetCountriesService);
      case 'languages':
        return this.getFromInjector(GetClarisaLanguagesService);
      case 'capSharingGenders':
        return this.getFromInjector(CapSharingGendersService);
      case 'capSharingFormats':
        return this.getFromInjector(CapSharingFormatsService);
      case 'capSharingTypes':
        return this.getFromInjector(CapSharingTypesService);
      case 'capSharingDegrees':
        return this.getFromInjector(CapSharingDegreesService);
      case 'capSharingLengths':
        return this.getFromInjector(CapSharingLengthsService);
      case 'disseminationQualifications':
        return this.getFromInjector(DisseminationQualificationsService);
      case 'toolFunctions':
        return this.getFromInjector(ToolFunctionsService);
      case 'initiatives':
        return this.getFromInjector(GetInitiativesService);
      case 'tags':
        return this.getFromInjector(GetTagsService);
      case 'oicrResults':
        return this.getFromInjector(OicrResultsService);
      default:
        return null;
    }
  }

  private getTertiaryServices(serviceName: ControlListServices) {
    switch (serviceName) {
      case 'capSharingDeliveryModalities':
        return this.getFromInjector(CapSharingDeliveryModalitiesService);
      case 'capSharingSessionPurpose':
        return this.getFromInjector(CapSharingSessionPurposeService);
      case 'yesOrNo':
        return this.getFromInjector(YesOrNotService);
      case 'expansionPotential':
        return this.getFromInjector(ExpansionPotentialService);
      case 'policyTypes':
        return this.getFromInjector(PolicyTypesService);
      case 'policyStages':
        return this.getFromInjector(PolicyStagesService);
      case 'geoFocus':
        return this.getFromInjector(GetGeoFocusService);
      case 'innResults':
        return this.getFromInjector(InnResultsService);
      default:
        return null;
    }
  }

  private getQuaternaryServices(serviceName: ControlListServices) {
    switch (serviceName) {
      case 'regions':
        return this.getFromInjector(GetRegionsService);
      case 'geoScopeOpenSearch':
        return this.getFromInjector(GetOsGeoScopeService);
      case 'openSearchCountries':
        return this.getFromInjector(GetOsCountriesService);
      case 'openSearchResult':
        return this.getFromInjector(GetOsResultService);
      case 'innoDevOutput':
        return this.getFromInjector(GetInnoDevOutputService);
      case 'innoUseOutput':
        return this.getFromInjector(GetInnoUseOutputService);
      case 'notableReferenceTypes':
        return this.getFromInjector(NotableReferenceTypesService);
      case 'informativeRoles':
        return this.getFromInjector(InformativeRolesService);
      case 'globalTargets':
        return this.getFromInjector(GlobalTargetsService);
      case 'impactAreaScores':
        return this.getFromInjector(ImpactAreaScoresService);
      case 'impactAreas':
        return this.getFromInjector(ImpactAreasService);
      default:
        return null;
    }
  }

  private getOtherServices(serviceName: ControlListServices) {
    switch (serviceName) {
      case 'openSearchSubNationals':
        return this.getFromInjector(GetOsSubnationalService);
      case 'getAllIndicators':
        return this.getFromInjector(GetAllIndicatorsService);
      case 'allResultStatus':
        return this.getFromInjector(GetAllResultStatusService);
      case 'getYears':
        return this.getFromInjector(GetYearsService);
      case 'getYearsByCode':
        return this.getFromInjector(GetYearsByCodeService);
      case 'getAllYears':
        return this.getFromInjector(GetAllYearsService);
      case 'ipOwners':
        return this.getFromInjector(IpOwnerService);
      case 'GetSubnationalByIsoAlpha':
        return this.getFromInjector(GetSubnationalByIsoAlphaService);
      case 'clarisaInstitutionsTypes':
        return this.getFromInjector(GetClarisaInstitutionsTypesService);
      case 'clarisaInstitutionsTypesChildless':
        return this.getFromInjector(GetClarisaInstitutionsTypesChildlessService);
      case 'sdgs':
        return this.getFromInjector(GetSdgsService);
      case 'scaling':
        return this.getFromInjector(ScalingService);
      case 'applicationOptions':
        return this.getFromInjector(ApplicationOptionsService);
      case 'levers':
        return this.getFromInjector(GetLeversService);
      case 'sciencePrograms':
        return this.getFromInjector(GetScienceProgramsService);
      case 'bilateralSciencePrograms':
        return this.getFromInjector(GetBilateralScienceProgramsService);
      case 'strategicObjectives':
        return this.getFromInjector(GetStrategicObjectivesService);
      case 'impactOutcomes':
        return this.getFromInjector(GetImpactOutcomesService);
      case 'leverStrategicOutcomes':
        return this.getFromInjector(GetLeverStrategicOutcomesService);
      case 'leverSdgTargets':
        return this.getFromInjector(GetLeverSdgTargetsService);
      case 'clarisaSdgTargets':
        return this.getFromInjector(GetClarisaSdgTargetsService);
      case 'projectStatus':
        return this.getFromInjector(GetProjectStatusService);
      case 'fundingTypes':
        return this.getFromInjector(GetFundingTypesService);
      case 'allianceStaffByGroup':
        return this.getFromInjector(GetAllianceStaffByGroupService);
      case 'sourceFilterOptions':
        return this.getFromInjector(SourceFilterOptionsService);
      default:
        console.warn(`Service ${serviceName} not found`);
        return null;
    }
  }
}
