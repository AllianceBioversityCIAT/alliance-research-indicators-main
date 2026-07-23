import { Injectable, WritableSignal, inject } from '@angular/core';
import { ToPromiseService } from './to-promise.service';
import { LoginRes, MainResponse } from '../interfaces/responses.interface';
import { GetViewComponents, Indicator, IndicatorTypes } from '../interfaces/api.interface';
import { GeneralInformation } from '@interfaces/result/general-information.interface';
import {
  GetResultsPaginationOptions,
  GetResultsResponseData,
  Result,
  ResultConfig,
  ResultFilter,
  V2ResultsPaginationMeta
} from '../interfaces/result/result.interface';
import { mapV2ResultListItemToResult, V2ResultListItem } from '../interfaces/result/map-v2-result-list-item';
import { ResultStatus } from '../interfaces/result-config.interface';
import { GetInstitution } from '../interfaces/get-institutions.interface';
import { PatchResultEvidences } from '../interfaces/patch-result-evidences.interface';
import { PatchAllianceAlignment } from '../interfaces/alliance-aligment.interface';
import { PatchPartners } from '../interfaces/patch-partners.interface';
import { Degree, Gender, GetCapSharing, IpOwners, Length, SessionFormat, SessionType } from '../interfaces/get-cap-sharing.interface';
import { CacheService } from './cache/cache.service';
import { AlignmentRequestParams, GetAllianceAlignment } from '../interfaces/get-alliance-alignment.interface';
import { GetMetadata } from '../interfaces/get-metadata.interface';
import { UserStaff } from '../interfaces/get-user-staff.interface';
import { GetCountries } from '../interfaces/get-countries.interface';
import { GetDeliveryModality } from '../interfaces/get-delivery-modality.interface';
import { GetLanguages } from '../interfaces/get-get-languages.interface';
import { SessionPurpose } from '../interfaces/get-session-purpose.interface';
import { GetPolicyChange } from '../interfaces/get-get-policy-change.interface';
import { ContactPersonResponse } from '../interfaces/contact-person.interface';
import { GlobalTarget } from '../interfaces/global-target.interface';
import { GetResultsByContract } from '../interfaces/get-results-by-contract.interface';
import { GetProjectDetail } from '../interfaces/get-project-detail.interface';
import { Portfolio, PortfolioPayload } from '../interfaces/portfolio.interface';
import { GetGeoLocation } from '../interfaces/get-geo-location.interface';
import { GetIndicatorsResultsAmount } from '../interfaces/get-indicators-results-amount.interface';
import { GetResultsStatus } from '../interfaces/get-results-status.interface';
import { GetRegion } from '../interfaces/get-region.interface';
import { GetGeoSearch } from '../interfaces/get-geo-search.interface';
import { GetOsCountries } from '../interfaces/get-os-countries.interface';
import { GetOsResult } from '@shared/interfaces/get-os-result.interface';
import { environment } from '../../../environments/environment';
import { PostError } from '../interfaces/post-error.interface';
import { GetContractsByUser } from '@shared/interfaces/get-contracts-by-user.interface';
import { GeneralReportItem } from '@shared/interfaces/get-general-report.interface';
import { GetOsSubNationals, OpenSearchFilters } from '../interfaces/get-os-subnational.interface';
import { GetAnnouncementSettingAvailable } from '../interfaces/get-announcement-setting-available.interface';
import { GetAllIndicators } from '../interfaces/get-all-indicators.interface';
import { GetAllResultStatus } from '../interfaces/get-all-result-status.interface';
import { GetSubnationalsByIsoAlpha } from '../interfaces/get-subnationals-by-iso-alpha.interface';
import { ControlListCacheService } from './control-list-cache.service';
import { SignalEndpointService } from './signal-endpoint.service';
import { GetCurrentUser } from '../interfaces/get-current-user.interfce';
import { PatchSubmitResult, PatchSubmitResultLatest } from '../interfaces/patch_submit-result.interface';
import { GetClarisaInstitutionsTypes } from '@shared/interfaces/get-clarisa-institutions-types.interface';
import { GetSdgs } from '@shared/interfaces/get-sdgs.interface';
import { PatchIpOwner } from '@shared/interfaces/patch-ip-owners';
import { AIAssistantResult, CreateResultResponse } from '@shared/components/all-modals/modals-content/create-result-modal/models/AIAssistantResult';
import { GetYear } from '@shared/interfaces/get-year.interface';
import { GetNextStep } from '@shared/interfaces/get-next-step.interface';
import { ExtendedHttpErrorResponse } from '@shared/interfaces/http-error-response.interface';
import { GetVersions } from '@shared/interfaces/get-versions.interface';
import { AskForHelp } from '../components/all-modals/modals-content/ask-for-help-modal/interfaces/ask-for-help.interface';
import { GreenChecks } from '@shared/interfaces/get-green-checks.interface';
import { HttpParams } from '@angular/common/http';
import { GetInnovationDetails } from '@shared/interfaces/get-innovation-details.interface';
import { InnovationCharacteristic, InnovationLevel, InnovationType } from '@shared/interfaces/get-innovation.interface';
import { ActorType } from '@shared/interfaces/get-actor-types.interface';
import { ClarisaInstitutionsSubTypes } from '@shared/interfaces/get-clarisa-institutions-subtypes.interface';
import { DynamoFeedback } from '../interfaces/dynamo-feedback.interface';
import { IssueCategory } from '../interfaces/issue-category.interface';
import { GenericList } from '@shared/interfaces/generic-list.interface';
import { Initiative } from '@shared/interfaces/initiative.interface';
import { FindContractsResponse } from '../interfaces/find-contracts.interface';
import { PoolFundingTagPatchBody, PoolFundingTagPatchResponse } from '@interfaces/bilateral/agresso-contract.interface';
import {
  BilateralMappingListPage,
  BilateralMappingListQuery,
  BilateralProjectMapping,
  ClarisaBilateralProjectOption,
  CreateBilateralMappingBody,
  UpdateBilateralMappingBody
} from '@interfaces/bilateral/bilateral-project-mapping.interface';
import {
  AlignmentResponse,
  BilateralTocCatalogResponse,
  PoolFundingSciencePrograms,
  UpdatePoolFundingAlignmentDto
} from '@interfaces/bilateral/pool-funding-alignment.interface';
import { GetLevers, GetLeversParams } from '@shared/interfaces/get-levers.interface';
import { GetSciencePrograms } from '@shared/interfaces/get-science-programs.interface';
import { PortfolioConfigItem, PortfolioScopedParams } from '@shared/interfaces/portfolio-config.interface';
import { FundingType } from '@shared/interfaces/funding-type.interface';
import { Configuration } from '@shared/interfaces/configuration.interface';
import { ConfigurationByKeyResponse } from '@shared/interfaces/configuration-by-key.interface';
import {
  AppConfigCategoriesResponse,
  AppConfigListItem,
  AppConfigListQuery,
  AppConfigListResponse,
  UpdateAppConfigDto
} from '@shared/interfaces/app-config.interface';
import { GetTags } from '@shared/interfaces/get-tags.interface';
import { GetOICRDetails } from '@shared/interfaces/gets/get-oicr-details.interface';
import { LeverStrategicOutcome, Oicr, OicrCreation, PatchOicr } from '@shared/interfaces/oicr-creation.interface';
import { LeverSdgTargetApi, PatchLeverSdgTargetsRequest } from '@shared/interfaces/lever-sdg-target.interface';
import { MaturityLevel } from '@shared/interfaces/maturity-level.interface';
import { InteractionFeedbackPayload } from '@shared/interfaces/feedback-interaction.interface';
import { ImpactArea } from '@shared/interfaces/impact-area.interface';
import { LinkResultsResponse } from '@shared/interfaces/link-results.interface';
import { LatestResult } from '@shared/interfaces/latest-result.interface';
import {
  ContractStaffReport,
  GeoScopeReport,
  TopContributorsContractReport,
  TopMainContactPersonsReport,
  TopPartnersReport,
  TopPrimaryLeversReport
} from '@shared/interfaces/project-dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  TP = inject(ToPromiseService);
  cache = inject(CacheService);
  clCache = inject(ControlListCacheService);
  private readonly signalEndpoint = inject(SignalEndpointService);

  login = (awsToken: string): Promise<MainResponse<LoginRes>> => {
    const url = () => `authorization/login`;
    return this.TP.post(url(), {}, { token: awsToken, isAuth: true });
  };

  refreshToken = (refreshToken: string): Promise<MainResponse<LoginRes>> => {
    const url = () => `authorization/refresh-token`;
    return this.TP.post(url(), {}, { token: refreshToken, isRefreshToken: true, isAuth: true });
  };

  GET_IndicatorTypes = (): Promise<MainResponse<IndicatorTypes[]>> => {
    const url = () => `indicator-types`;
    return this.TP.get(url(), {});
  };

  GET_AllIndicators = (): Promise<MainResponse<GetAllIndicators[]>> => {
    const url = () => `indicators`;
    return this.TP.get(url(), {});
  };

  GET_MaturityLevels = (): Promise<MainResponse<MaturityLevel[]>> => {
    const url = () => `maturity-levels`;
    return this.TP.get(url(), {});
  };

  GET_Institutions = (): Promise<MainResponse<GetInstitution[]>> => {
    const url = () => `tools/clarisa/institutions?location=true&type=true&only-hq=true`;
    return this.TP.get(url(), {});
  };

  GET_InstitutionsTypesChildless = (): Promise<MainResponse<GetClarisaInstitutionsTypes[]>> => {
    const url = () => `tools/clarisa/institutions-types/childless`;
    return this.TP.get(url(), {});
  };

  GET_SDGs = (): Promise<MainResponse<GetSdgs[]>> => {
    const url = () => `tools/clarisa/sdgs`;
    return this.TP.get(url(), {});
  };

  GET_Levers = (params?: GetLeversParams): Promise<MainResponse<GetLevers[]>> => {
    const url = () => `tools/clarisa/levers`;
    let httpParams = new HttpParams();
    if (params?.portfolioId != null) httpParams = httpParams.set('portfolioId', String(params.portfolioId));
    if (params?.reportYear != null) httpParams = httpParams.set('reportYear', String(params.reportYear));
    return this.TP.get(url(), httpParams.keys().length ? { params: httpParams } : {});
  };

  GET_StrategicObjectives = (params?: PortfolioScopedParams): Promise<MainResponse<PortfolioConfigItem[]>> => {
    const url = () => `strategic-objectives`;
    let httpParams = new HttpParams();
    if (params?.portfolioId != null) httpParams = httpParams.set('portfolioId', String(params.portfolioId));
    if (params?.reportYear != null) httpParams = httpParams.set('reportYear', String(params.reportYear));
    return this.TP.get(url(), httpParams.keys().length ? { params: httpParams } : {});
  };

  GET_ImpactOutcomes = (params?: PortfolioScopedParams): Promise<MainResponse<PortfolioConfigItem[]>> => {
    const url = () => `impact-outcomes`;
    let httpParams = new HttpParams();
    if (params?.portfolioId != null) httpParams = httpParams.set('portfolioId', String(params.portfolioId));
    if (params?.reportYear != null) httpParams = httpParams.set('reportYear', String(params.reportYear));
    return this.TP.get(url(), httpParams.keys().length ? { params: httpParams } : {});
  };

  GET_Portfolios = (): Promise<MainResponse<Portfolio[]>> => {
    return this.TP.get('portfolios', {});
  };

  POST_Portfolio = (body: PortfolioPayload): Promise<MainResponse<Portfolio>> => {
    return this.TP.post('portfolios', body, {});
  };

  PATCH_Portfolio = (portfolioId: number, body: PortfolioPayload): Promise<MainResponse<Portfolio>> => {
    return this.TP.patch(`portfolios/${portfolioId}`, body, {});
  };

  DELETE_Portfolio = (portfolioId: number): Promise<MainResponse<unknown>> => {
    return this.TP.delete(`portfolios/${portfolioId}`, {});
  };

  GET_FundingTypes = (): Promise<MainResponse<FundingType[]>> => {
    const url = () => `agresso/contracts/funding-types`;
    return this.TP.get(url(), {});
  };

  GET_SciencePrograms = (): Promise<MainResponse<GetSciencePrograms[]>> => {
    const url = () => `tools/clarisa/science-programs`;
    return this.TP.get(url(), {});
  };

  GET_ClarisaSdgTargets = (): Promise<MainResponse<LeverSdgTargetApi[]>> => {
    const url = () => `tools/clarisa/sdg-targets`;
    return this.TP.get(url(), {});
  };

  GET_InstitutionsTypes = (): Promise<MainResponse<GetClarisaInstitutionsTypes[]>> => {
    const url = () => `tools/clarisa/institutions-types`;
    return this.TP.get(url(), {});
  };

  GET_SubNationals = (isoAlpha2: string): Promise<MainResponse<GetSubnationalsByIsoAlpha[]>> => {
    const url = () => `tools/clarisa/sub-nationals/country/${isoAlpha2}`;
    return this.TP.get(url(), {});
  };

  GET_Tags = (): Promise<MainResponse<GetTags[]>> => {
    const url = () => `tags`;
    return this.TP.get(url(), {});
  };

  GET_OicrResults = (): Promise<MainResponse<Oicr[]>> => {
    const url = () => `temp/oicrs`;
    return this.TP.get(url(), {});
  };

  GET_Initiatives = (): Promise<MainResponse<Initiative[]>> => {
    const url = () => `tools/clarisa/initiatives`;
    return this.TP.get(url(), {});
  };

  GET_IndicatorTypeById = (id: number): Promise<MainResponse<Indicator>> => {
    const url = () => `indicator-types/${id}`;
    return this.TP.get(url(), {});
  };

  GET_IndicatorById = (id: number): Promise<MainResponse<Indicator>> => {
    const url = () => `indicators/${id}`;
    return this.TP.get(url(), {});
  };

  GET_ViewComponents = (): Promise<MainResponse<GetViewComponents[]>> => {
    const url = () => `authorization/view/scomponents`;
    return this.TP.get(url(), {});
  };

  GET_Results = async (
    resultFilter: ResultFilter,
    _resultConfig?: ResultConfig,
    pagination?: GetResultsPaginationOptions
  ): Promise<MainResponse<GetResultsResponseData>> => {
    const pairs: [string, string][] = [];

    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(10_000, Math.max(1, pagination?.limit ?? 10_000));
    pairs.push(['page', String(page)], ['limit', String(limit)]);

    const sortOrder = pagination?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    pairs.push(['sort-order', sortOrder], ['sort-field', pagination?.sortField?.trim() || 'code']);

    const search = pagination?.search?.trim();
    if (search) {
      pairs.push(['search', search]);
    }

    const indicatorKeysHandled = new Set(['indicator-codes', 'indicator-codes-tabs', 'indicator-codes-filter']);

    if (resultFilter['indicator-codes-tabs']?.length) {
      pairs.push(['indicators', resultFilter['indicator-codes-tabs'].join(',')]);
    } else if (resultFilter['indicator-codes-filter']?.length) {
      pairs.push(['indicators', resultFilter['indicator-codes-filter'].join(',')]);
    } else if (resultFilter['indicator-codes']?.length) {
      pairs.push(['indicators', resultFilter['indicator-codes'].join(',')]);
    }

    if (resultFilter) {
      Object.entries(resultFilter).forEach(([key, value]) => {
        if (indicatorKeysHandled.has(key)) return;
        if (key === 'create-user-codes') return;
        if (Array.isArray(value) && value.length) {
          pairs.push([key, value.join(',')]);
        }
      });
    }

    const onlyOwnResults = Array.isArray(resultFilter?.['create-user-codes']) && resultFilter['create-user-codes'].length > 0;
    pairs.push(['only-own-results', onlyOwnResults ? 'true' : 'false']);

    const qs = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const raw = await this.TP.get(`v2/results?${qs}`, {});
    return this.unwrapV2ResultsResponse(raw);
  };

  GET_ResultCenterXlsx = async (
    resultFilter: ResultFilter,
    pagination?: Pick<GetResultsPaginationOptions, 'sortField' | 'sortOrder' | 'search'>
  ): Promise<Blob> => {
    const pairs: [string, string][] = [];

    const sortOrder = pagination?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    pairs.push(['sort-order', sortOrder], ['sort-field', pagination?.sortField?.trim() || 'code']);

    const search = pagination?.search?.trim();
    if (search) {
      pairs.push(['search', search]);
    }

    const indicatorKeysHandled = new Set(['indicator-codes', 'indicator-codes-tabs', 'indicator-codes-filter']);

    if (resultFilter['indicator-codes-tabs']?.length) {
      pairs.push(['indicators', resultFilter['indicator-codes-tabs'].join(',')]);
    } else if (resultFilter['indicator-codes-filter']?.length) {
      pairs.push(['indicators', resultFilter['indicator-codes-filter'].join(',')]);
    } else if (resultFilter['indicator-codes']?.length) {
      pairs.push(['indicators', resultFilter['indicator-codes'].join(',')]);
    }

    if (resultFilter) {
      Object.entries(resultFilter).forEach(([key, value]) => {
        if (indicatorKeysHandled.has(key)) return;
        if (key === 'create-user-codes') return;
        if (Array.isArray(value) && value.length) {
          pairs.push([key, value.join(',')]);
        }
      });
    }

    const onlyOwnResults = Array.isArray(resultFilter?.['create-user-codes']) && resultFilter['create-user-codes'].length > 0;
    pairs.push(['only-own-results', onlyOwnResults ? 'true' : 'false']);

    let params = new HttpParams();
    for (const [k, v] of pairs) {
      params = params.set(k, v);
    }

    return this.TP.getBlob('reports/resultCenter/xlsx', { params });
  };

  GET_ResultPdfReport = async (
    resultCode: string | number,
    reportingPlatform = 'STAR',
    reportYear?: number | string | null,
    reportName = 'cap_sharing'
  ): Promise<MainResponse<string>> => {
    let params = new HttpParams().set('is-html', 'false').set('report_name', reportName).set('reportingPlatforms', reportingPlatform);

    if (reportYear != null && String(reportYear).trim() !== '') {
      params = params.set('reportYear', String(reportYear));
    }

    return this.TP.get(`reports/${encodeURIComponent(String(resultCode))}/pdf`, { params });
  };

  private unwrapV2ResultsResponse(raw: MainResponse<unknown>): MainResponse<GetResultsResponseData> {
    const payload = raw?.data;
    let rows: V2ResultListItem[] = [];
    let total = 0;
    let pagination: V2ResultsPaginationMeta | undefined;

    if (payload != null && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
      const envelope = payload as { data?: unknown; total?: number; pagination?: V2ResultsPaginationMeta };
      rows = Array.isArray(envelope.data) ? (envelope.data as V2ResultListItem[]) : [];
      if (typeof envelope.pagination?.total === 'number') {
        total = envelope.pagination.total;
        pagination = envelope.pagination;
      } else if (typeof envelope.total === 'number') {
        total = envelope.total;
      } else {
        total = rows.length;
      }
    } else if (Array.isArray(payload)) {
      rows = payload as V2ResultListItem[];
      total = rows.length;
    }

    const results = rows.map(row => mapV2ResultListItemToResult(row));
    return {
      ...raw,
      data: pagination ? { results, total, pagination } : { results, total }
    };
  }

  GET_ValidateTitle = (title: string): Promise<MainResponse<{ isValid: boolean; result_official_code?: number; platform_code?: string }>> => {
    const queryString = title ? `?title=${title}` : '';
    const url = () => `results/validate-title${queryString}`;
    return this.TP.get(url(), {});
  };

  POST_CreateOicr = <T>(body: T, resultCode?: number): Promise<MainResponse<Result>> => {
    const queryString = resultCode ? `?resultCode=${resultCode}` : '';
    const url = () => `results/oicr${queryString}`;
    return this.TP.patch(url(), body, {});
  };

  PATCH_Oicr = <T>(id: number, body: T): Promise<MainResponse<PatchOicr>> => {
    const url = () => `results/oicr/${id}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_Oicr = (id: number): Promise<MainResponse<PatchOicr>> => {
    const url = () => `results/oicr/${id}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  // create result
  POST_Result = <T>(body: T): Promise<MainResponse<Result>> => {
    const url = () => `results`;
    return this.TP.post(url(), body, {});
  };

  POST_CreateResult = (result: AIAssistantResult): Promise<MainResponse<CreateResultResponse | ExtendedHttpErrorResponse>> => {
    const url = () => `results/ai/formalize`;
    return this.TP.post(url(), result, {});
  };

  // dynamo feedback
  POST_DynamoFeedback = <T>(body: T): Promise<MainResponse<DynamoFeedback>> => {
    const url = () => `dynamo-feedback/save-data`;
    return this.TP.post(url(), body, {});
  };

  GET_DynamoFeedback = (): Promise<MainResponse<DynamoFeedback>> => {
    const url = () => `dynamo-feedback/test-data`;
    return this.TP.get(url(), {});
  };

  GET_IssueCategories = (): Promise<MainResponse<IssueCategory[]>> => {
    const url = () => `issue-categories`;
    return this.TP.get(url(), {});
  };

  GET_Configuration = (id: string, section: string): Promise<MainResponse<Configuration>> => {
    const url = () => `user/configuration/${id}?component=${section}`;
    return this.TP.get(url(), {});
  };

  PATCH_Configuration = (id: string, section: string, body: Configuration): Promise<MainResponse<Configuration>> => {
    const url = () => `user/configuration/${id}?component=${section}`;
    return this.TP.patch(url(), body, {});
  };

  GET_ConfigurationByKey = (key: string): Promise<MainResponse<ConfigurationByKeyResponse>> => {
    const url = () => `configuration/${encodeURIComponent(key)}`;
    return this.TP.get(url(), {});
  };

  GET_AppConfigList = (query: AppConfigListQuery = {}): Promise<MainResponse<AppConfigListResponse>> => {
    const url = () => {
      const params = new URLSearchParams();
      const search = query.search?.trim();
      if (search) params.set('search', search);
      if (query.category) params.set('category', query.category);
      if (query.subcategory) params.set('subcategory', query.subcategory);
      if (query.sortField) params.set('sort-field', query.sortField);
      if (query.sortOrder) params.set('sort-order', query.sortOrder);
      const qs = params.toString();
      return qs ? `configuration?${qs}` : 'configuration';
    };
    return this.TP.get(url(), {});
  };

  GET_AppConfigCategories = (): Promise<MainResponse<AppConfigCategoriesResponse>> => {
    const url = () => 'configuration/categories-and-subcategories';
    return this.TP.get(url(), {});
  };

  PATCH_AppConfigByKey = (key: string, body: UpdateAppConfigDto): Promise<MainResponse<AppConfigListItem>> => {
    const url = () => `configuration/${encodeURIComponent(key)}`;
    return this.TP.patch(url(), body, {});
  };

  POST_PartnerRequest = <T>(body: T): Promise<MainResponse<Result>> => {
    const url = () => `tools/clarisa/manager/partner-request/create`;
    return this.TP.post(url(), body, {});
  };

  GET_UserStaff = (): Promise<MainResponse<UserStaff[]>> => {
    const url = () => `agresso/staff`;
    return this.TP.get(url(), {});
  };

  GET_AllianceStaff = (groupId: number): Promise<MainResponse<UserStaff[]>> => {
    const groupIdQuery = groupId ? `?groupId=${groupId}` : '';
    const url = () => `results/alliance-user-staff/by-groups/map${groupIdQuery}`;
    return this.TP.get(url(), {});
  };

  GET_GeneralInformation = (id: number): Promise<MainResponse<GeneralInformation>> => {
    const url = () => `results/${id}/general-information`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_GeneralInformation = <T>(id: number, body: T): Promise<MainResponse<GeneralInformation>> => {
    const url = () => `results/${id}/general-information`;
    return this.TP.patch(url(), body, {
      useResultInterceptor: true
    });
  };

  GET_Versions = (resultCode: number): Promise<MainResponse<GetVersions>> => {
    const url = () => `results/versions/${resultCode}`;
    return this.TP.get(url(), { useResultInterceptor: true });
  };

  GET_InnovationReadinessLevels = (): Promise<MainResponse<InnovationLevel[]>> => {
    const url = () => `tools/clarisa/innovation-readiness-levels`;
    return this.TP.get(url(), {});
  };

  GET_InnovationCharacteristics = (): Promise<MainResponse<InnovationCharacteristic[]>> => {
    const url = () => `tools/clarisa/innovation-characteristics`;
    return this.TP.get(url(), {});
  };

  GET_InformativeRoles = (): Promise<MainResponse<GenericList[]>> => {
    const url = () => `informative-roles`;
    return this.TP.get(url(), {});
  };

  GET_GlobalTargets = (impactAreaId: number): Promise<MainResponse<GlobalTarget[]>> => {
    const url = () => `tools/clarisa/global-targets/impact-area/${impactAreaId}`;
    return this.TP.get(url(), {});
  };

  GET_ImpactAreaScores = (): Promise<MainResponse<GenericList[]>> => {
    const url = () => `impact-area-score`;
    return this.TP.get(url(), {});
  };

  GET_InnovationTypes = (): Promise<MainResponse<InnovationType[]>> => {
    const url = () => `tools/clarisa/innovation-types`;
    return this.TP.get(url(), {});
  };

  GET_InstitutionTypes = (): Promise<MainResponse<ClarisaInstitutionsSubTypes[]>> => {
    const url = () => `tools/clarisa/institutions-types`;
    return this.TP.get(url(), {});
  };

  GET_SubInstitutionTypes = (depthLevel: number, code?: number): Promise<MainResponse<ClarisaInstitutionsSubTypes[]>> => {
    const codeQuery = code !== undefined ? '?code=' + code : '';
    const url = () => `tools/clarisa/institutions-types/depth-level/${depthLevel}${codeQuery}`;
    return this.TP.get(url(), {});
  };

  GET_ActorTypes = (): Promise<MainResponse<ActorType[]>> => {
    const url = () => `tools/clarisa/actor-types`;
    return this.TP.get(url(), {});
  };

  GET_Partners = (id: number): Promise<MainResponse<PatchPartners>> => {
    const url = () => `results/institutions/by-result-id/${id}?role=partners`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_Partners = <T>(id: number, body: T): Promise<MainResponse<GeneralInformation>> => {
    const url = () => `results/institutions/partners/by-result-id/${id}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_InnovationDetails = (resultCode: number): Promise<MainResponse<GetInnovationDetails>> => {
    const url = () => `results/innovation-dev/${resultCode}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_InnovationDetails = <T>(resultCode: number, body: T): Promise<MainResponse<GetInnovationDetails>> => {
    const url = () => `results/innovation-dev/${resultCode}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_ResultEvidences = (resultId: number): Promise<MainResponse<PatchResultEvidences>> => {
    const url = () => `results/evidences/principal/${resultId}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_ResultEvidences = <T>(resultId: number, body: T): Promise<MainResponse<PatchResultEvidences>> => {
    const url = () => `results/evidences/by-result-id/${resultId}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_Years = (resultCode?: number, reportYear?: number): Promise<MainResponse<GetYear[]>> => {
    const url = 'results/year';

    let params = new HttpParams();
    if (resultCode != null) params = params.set('resultCode', resultCode.toString());
    if (reportYear != null) params = params.set('reportYear', reportYear.toString());

    return this.TP.get(url, { params });
  };

  GET_IpOwners = (): Promise<MainResponse<IpOwners[]>> => {
    const url = () => `results/intellectual-property/owners`;
    return this.TP.get(url(), { loadingTrigger: true });
  };

  GET_ApplicationOptions = (): Promise<MainResponse<GenericList[]>> => {
    const url = () => `results/intellectual-property/application-options`;
    return this.TP.get(url(), { loadingTrigger: true });
  };

  GET_DisseminationQualifications = (id?: number): Promise<MainResponse<GenericList[]>> => {
    const url = () => (id !== undefined ? `dissemination-qualifications/${id}` : 'dissemination-qualifications');
    return this.TP.get(url(), {});
  };

  GET_ToolFunctions = (): Promise<MainResponse<GenericList[]>> => {
    const url = () => `tool-functions`;
    return this.TP.get(url(), {});
  };

  GET_ExpansionPotentials = (): Promise<MainResponse<GenericList[]>> => {
    const url = () => `expansion-potentials`;
    return this.TP.get(url(), {});
  };

  GET_IpOwner = (id: number): Promise<MainResponse<PatchIpOwner>> => {
    const url = () => `results/intellectual-property/${id}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_IpOwners = <T>(id: number, body: T): Promise<MainResponse<PatchIpOwner>> => {
    const url = () => `results/intellectual-property/${id}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_CapacitySharing = (): Promise<MainResponse<GetCapSharing>> => {
    const url = () => `results/capacity-sharing/by-result-id/${this.cache.getCurrentNumericResultId()}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_CapacitySharing = <T>(body: T): Promise<MainResponse<GetCapSharing>> => {
    const url = () => `results/capacity-sharing/by-result-id/${this.cache.getCurrentNumericResultId()}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_PolicyChange = (id: number): Promise<MainResponse<GetPolicyChange>> => {
    const url = () => `results/policy-change/by-result-id/${id}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_PolicyChange = <T>(id: number, body: T): Promise<MainResponse<GetPolicyChange>> => {
    const url = () => `results/policy-change/by-result-id/${id}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_Alignments = (id: number, params?: AlignmentRequestParams): Promise<MainResponse<GetAllianceAlignment>> => {
    const url = () => `results/${id}/alignments`;
    let httpParams = new HttpParams();
    if (params?.portfolioId != null) httpParams = httpParams.set('portfolioId', String(params.portfolioId));
    if (params?.return != null) httpParams = httpParams.set('return', String(params.return));
    return this.TP.get(url(), {
      ...(httpParams.keys().length ? { params: httpParams } : {}),
      loadingTrigger: true,
      useResultInterceptor: true
    });
  };

  PATCH_Alignments = <T>(id: number, body: T, params?: AlignmentRequestParams): Promise<MainResponse<PatchAllianceAlignment>> => {
    const url = () => `results/${id}/alignments`;
    let httpParams = new HttpParams();
    if (params?.portfolioId != null) httpParams = httpParams.set('portfolioId', String(params.portfolioId));
    if (params?.return != null) httpParams = httpParams.set('return', String(params.return));
    return this.TP.patch(url(), body, {
      ...(httpParams.keys().length ? { params: httpParams } : {}),
      useResultInterceptor: true
    });
  };

  GET_SessionFormat = (): Promise<MainResponse<SessionFormat[]>> => {
    const url = () => `session/format`;
    return this.TP.get(url(), {});
  };

  GET_SessionType = (): Promise<MainResponse<SessionType[]>> => {
    const url = () => `session/type`;
    return this.TP.get(url(), {});
  };

  GET_Degrees = (): Promise<MainResponse<Degree[]>> => {
    const url = () => `degree`;
    return this.TP.get(url(), {});
  };

  GET_SessionLength = (): Promise<MainResponse<Length[]>> => {
    const url = () => `session/length`;
    return this.TP.get(url(), {});
  };

  GET_Gender = (): Promise<MainResponse<Gender[]>> => {
    const url = () => `gender`;
    return this.TP.get(url(), {});
  };

  GET_ReferencesType = (): Promise<MainResponse<GenericList[]>> => {
    const url = () => `notable-reference-types`;
    return this.TP.get(url(), {});
  };

  GET_Metadata = (id: number, platform?: string): Promise<MainResponse<GetMetadata>> => {
    const url = () => `results/${id}/metadata`;
    return this.TP.get(url(), {
      useResultInterceptor: true,
      platform: platform
    });
  };

  GET_Countries = (params?: { 'is-sub-national'?: boolean }): Promise<MainResponse<GetCountries[]>> => {
    const url = () => `tools/clarisa/countries`;
    const stringParams = params ? Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])) : undefined;
    return this.TP.getWithParams(url(), stringParams);
  };

  GET_DeliveryModalities = (): Promise<MainResponse<GetDeliveryModality[]>> => {
    const url = () => `delivery-modalities`;
    return this.TP.get(url(), {});
  };

  GET_Languages = (): Promise<MainResponse<GetLanguages[]>> => {
    const url = () => `tools/clarisa/languages`;
    return this.TP.get(url(), {});
  };

  GET_SessionPurpose = (): Promise<MainResponse<SessionPurpose[]>> => {
    const url = () => `session/purpose`;
    return this.TP.get(url(), {});
  };

  GET_ContractsByUser = (orderField?: string, direction?: string): Promise<MainResponse<GetContractsByUser[]>> => {
    const orderFieldQuery = orderField ? `&order-field=${orderField}` : '';
    const directionQuery = direction ? `&direction=${direction}` : '';
    const url = () => 'agresso/contracts/results/current-user';
    const fullUrl = `${url()}${orderFieldQuery}${directionQuery}`;
    return this.TP.get(fullUrl, {});
  };

  GET_FindContracts = (filters?: {
    'current-user'?: boolean;
    'contract-code'?: string;
    'project-name'?: string;
    'principal-investigator'?: string;
    lever?: string;
    status?: string;
    'start-date'?: string;
    'order-field'?: string;
    direction?: string;
    'end-date'?: string;
    'funding-type'?: string;
    query?: string;
    page?: number | string;
    limit?: number | string;
    project?: string;
    'exclude-pooled-funding'?: boolean;
    'with-indicators'?: boolean;
    'pool-funding-contributor'?: boolean;
  }): Promise<MainResponse<FindContractsResponse>> => {
    const url = () => 'agresso/contracts/find-contracts';
    const params = this.buildFindContractsParams(filters);
    return this.TP.get(url(), { params });
  };

  PATCH_PoolFundingTag = (
    code: string,
    body: PoolFundingTagPatchBody
  ): Promise<MainResponse<PoolFundingTagPatchResponse>> => {
    const url = () => `agresso/contracts/${encodeURIComponent(code)}/pool-funding-tag`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  // Bilateral routes are URI-versioned and the backend regex on :resultCode accepts
  // only digits, so we strip any STAR- prefix the FE may pass in (route params can
  // arrive in either form). See bilateral-module/ari-backend-context handoff §4.
  private bilateralPath(resultCode: string, suffix = ''): string {
    const numeric = resultCode.replace(/^STAR-/i, '');
    return `v1/results/${encodeURIComponent(numeric)}/pool-funding-alignment${suffix}`;
  }

  GET_PoolFundingAlignment = (resultCode: string): Promise<MainResponse<AlignmentResponse>> => {
    return this.TP.get(this.bilateralPath(resultCode), {});
  };

  // Per-result SP picker source — scoped to the result's mapped CLARISA project.
  // Replaces the catalog-wide GET_SciencePrograms as the picker source (the catalog
  // method stays for display-only contexts). No query params; scoping is server-side.
  GET_PoolFundingSciencePrograms = (resultCode: string): Promise<MainResponse<PoolFundingSciencePrograms>> => {
    return this.TP.get(this.bilateralPath(resultCode, '/science-programs'), {});
  };

  // Result-scoped ToC catalog (SP → level → ToC result → indicator), sourced live
  // from lambda-toc via the backend's cache. Same path as the modal-era tree — the
  // backend reshaped the envelope to `BilateralTocCatalogResponse` (only the generic
  // changed here). Read-only; no query params today.
  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 (T-BIL-TM2-02)
  GET_PoolFundingHlosIndicators = (resultCode: string): Promise<MainResponse<BilateralTocCatalogResponse>> => {
    return this.TP.get(this.bilateralPath(resultCode, '/hlos-indicators'), {});
  };

  PATCH_PoolFundingAlignment = (
    resultCode: string,
    body: UpdatePoolFundingAlignmentDto
  ): Promise<MainResponse<AlignmentResponse>> => {
    return this.TP.patch(this.bilateralPath(resultCode), body, {});
  };

  // Center Admin — Bilateral Project Mappings CRUD.
  // @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (T-BIL-CAM-01)
  GET_BilateralProjectMappings = (query?: BilateralMappingListQuery): Promise<MainResponse<BilateralMappingListPage>> => {
    const url = () => `bilateral-project-mappings`;
    const params: Record<string, string> = {};
    if (query?.page !== undefined) params['page'] = String(query.page);
    if (query?.limit !== undefined) params['limit'] = String(query.limit);
    if (query?.search) params['search'] = query.search;
    if (query?.is_active !== undefined) params['is_active'] = String(query.is_active);
    if (query?.source) params['source'] = query.source;
    return this.TP.getWithParams(url(), params);
  };

  GET_BilateralProjectMapping = (id: number): Promise<MainResponse<BilateralProjectMapping>> => {
    const url = () => `bilateral-project-mappings/${id}`;
    return this.TP.get(url(), {});
  };

  POST_BilateralProjectMapping = (body: CreateBilateralMappingBody): Promise<MainResponse<BilateralProjectMapping>> => {
    const url = () => `bilateral-project-mappings`;
    return this.TP.post(url(), body, { useResultInterceptor: true });
  };

  PATCH_BilateralProjectMapping = (id: number, body: UpdateBilateralMappingBody): Promise<MainResponse<BilateralProjectMapping>> => {
    const url = () => `bilateral-project-mappings/${id}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  PATCH_BilateralProjectMappingDeactivate = (id: number): Promise<MainResponse<BilateralProjectMapping>> => {
    const url = () => `bilateral-project-mappings/${id}/deactivate`;
    return this.TP.patch(url(), {}, { useResultInterceptor: true });
  };

  GET_ClarisaBilateralProjects = (search?: string): Promise<MainResponse<ClarisaBilateralProjectOption[]>> => {
    const url = () => `tools/clarisa/projects/bilateral`;
    if (search) return this.TP.getWithParams(url(), { search });
    return this.TP.get(url(), {});
  };

  GET_ResultsCount = (agreementId: string): Promise<MainResponse<GetProjectDetail>> => {
    const url = () => `agresso/contracts/${agreementId}/results/count`;
    return this.TP.get(url(), {});
  };

  GET_TopContributorsContracts = (contractId: string, limit = 5): Promise<MainResponse<TopContributorsContractReport>> => {
    const url = () => `agresso/contracts/reports/top-contributors-contracts?contract-id=${encodeURIComponent(contractId)}&limit=${limit}`;
    return this.TP.get(url(), {});
  };

  GET_TopPartners = (contractId: string, limit = 5): Promise<MainResponse<TopPartnersReport>> => {
    const url = () => `agresso/contracts/reports/top-partners?contract-id=${encodeURIComponent(contractId)}&limit=${limit}`;
    return this.TP.get(url(), {});
  };

  GET_TopMainContactPersons = (contractId: string, limit = 5): Promise<MainResponse<TopMainContactPersonsReport>> => {
    const url = () => `agresso/contracts/reports/top-main-contact-persons?contract-id=${encodeURIComponent(contractId)}&limit=${limit}`;
    return this.TP.get(url(), {});
  };

  GET_TopPrimaryLevers = (contractId: string, limit = 5): Promise<MainResponse<TopPrimaryLeversReport>> => {
    const url = () => `agresso/contracts/reports/top-primary-levers?contract-id=${encodeURIComponent(contractId)}&limit=${limit}`;
    return this.TP.get(url(), {});
  };

  GET_ContractStaff = (contractId: string): Promise<MainResponse<ContractStaffReport>> => {
    const url = () => `agresso/contracts/reports/contract-staff?contract-id=${encodeURIComponent(contractId)}`;
    return this.TP.get(url(), {});
  };

  GET_GeoScope = (contractId: string, limit = 5): Promise<MainResponse<GeoScopeReport>> => {
    const url = () => `agresso/contracts/reports/geo-scope?contract-id=${encodeURIComponent(contractId)}&limit=${limit}`;
    return this.TP.get(url(), {});
  };

  GET_GeneralReport = (): Promise<MainResponse<GeneralReportItem[]>> => {
    const url = () => `results/general-report/all`;
    return this.TP.get(url(), {});
  };

  GET_ResultsByContractId = (contractId: string): Promise<MainResponse<GetResultsByContract[]>> => {
    const url = () => `results/contracts/${contractId}`;
    return this.TP.get(url(), {});
  };

  GET_ResultsStatus = (): Promise<MainResponse<GetResultsStatus[]>> => {
    const url = () => `results/status/result-amount/current-user`;
    return this.TP.get(url(), {});
  };

  GET_AllResultStatus = (): Promise<MainResponse<GetAllResultStatus[]>> => {
    const url = () => `results/status`;
    return this.TP.get(url(), {});
  };

  GET_IndicatorsResultsAmount = (): Promise<MainResponse<GetIndicatorsResultsAmount[]>> => {
    const url = () => `indicators/results-amount/current-user`;
    return this.TP.get(url(), {});
  };

  GET_LatestResults = (): Promise<MainResponse<LatestResult[]>> => {
    const url = () => `results/last-updated/current-user?limit=3`;
    return this.TP.get(url(), {});
  };

  GET_GeoLocation = (id: number): Promise<MainResponse<GetGeoLocation>> => {
    const url = () => `results/${id}/geo-location`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_GeoLocation = <T>(id: number, body: T): Promise<MainResponse<GetGeoLocation>> => {
    const url = () => `results/${id}/geo-location`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_LinkedResults = (id: number): Promise<MainResponse<LinkResultsResponse>> => {
    const url = () => `link-results/details/${id}`;
    return this.TP.get(url(), { loadingTrigger: true, useResultInterceptor: true });
  };

  PATCH_LinkedResults = (id: number, body: LinkResultsResponse): Promise<MainResponse<LinkResultsResponse>> => {
    const url = () => `link-results/details/${id}`;
    return this.TP.patch(url(), body, { useResultInterceptor: true });
  };

  GET_Regions = (): Promise<MainResponse<GetRegion[]>> => {
    const url = () => `tools/clarisa/regions`;
    return this.TP.get(url(), {});
  };

  GET_GeoSearch = (scope: string, search: string): Promise<MainResponse<GetGeoSearch[]>> => {
    const url = () => `tools/clarisa/manager/opensearch/${scope}/search?query=${search}`;
    return this.TP.get(url(), {});
  };

  GET_OpenSearchCountries = (search: string): Promise<MainResponse<GetOsCountries[]>> => {
    const url = () => `tools/clarisa/manager/opensearch/countries/search?query=${search}`;
    return this.TP.get(url(), {});
  };

  GET_ImpactAreas = (): Promise<MainResponse<ImpactArea[]>> => {
    const url = () => `tools/clarisa/impact-areas`;
    return this.TP.get(url(), {});
  };

  GET_OpenSearchSubNationals = (search: string, openSearchFilters?: OpenSearchFilters): Promise<MainResponse<GetOsSubNationals[]>> => {
    const { country } = openSearchFilters || {};
    const countryQuery = country ? `&country=${country}` : '';
    const url = () => `tools/clarisa/manager/opensearch/subnational/search?query=${search}${countryQuery}`;
    return this.TP.get(url(), {});
  };

  GET_OpenSearchResult = (search: string, sampleSize: number): Promise<MainResponse<GetOsResult[]>> => {
    const url = () => `opensearch/result/search?query=${search}&sample-size=${sampleSize}`;
    return this.TP.get(url(), {});
  };

  GET_AnnouncementSettingAvailable = (): Promise<MainResponse<GetAnnouncementSettingAvailable[]>> => {
    const url = () => `announcement-setting/available`;
    return this.TP.get(url(), {});
  };

  indicatorsWithResult = this.signalEndpoint.createEndpoint<GetAllIndicators[]>(() => 'indicators/with/result');
  indicatorTabs = this.signalEndpoint.createEndpoint<GetAllIndicators[]>(() => 'indicators', 'indicatortabs');

  // Add the saveErrors endpoint
  saveErrors = (error: PostError): Promise<MainResponse<PostError>> => {
    const url = () => '';
    return this.TP.post(url(), { error }, { isAuth: environment.saveErrorsUrl });
  };

  GET_CurrentUser = (token: string): Promise<MainResponse<GetCurrentUser>> => {
    const url = () => `authorization/users/current`;
    return this.TP.get(url(), { isAuth: true, token });
  };

  PATCH_ReportingCycle = (resultCode: number, newReportYear: string) => {
    const url = () => `results/green-checks/new-reporting-cycle/${resultCode}/year/${newReportYear}`;
    return this.TP.patch(url(), {});
  };

  GET_AllSubmitionStatus = () => {
    const url = () => `results/green-checks/change/status`;
    return this.TP.get(url(), {});
  };

  PATCH_SubmitResult = (
    { resultCode, comment, status }: PatchSubmitResult,
    body?: PatchSubmitResultLatest
  ): Promise<MainResponse<PatchSubmitResult | ExtendedHttpErrorResponse>> => {
    const url = () => `results/status/workflow/change-status/${resultCode}/to-status/${status}`;
    const requestBody: PatchSubmitResultLatest = body ? { ...body, submission_comment: comment ?? '' } : { submission_comment: comment ?? '' };
    return this.TP.post(url(), requestBody, { useResultInterceptor: true });
  };

  GET_ReviewStatuses = () => {
    const url = () => `results/status/review-statuses`;
    return this.TP.get(url(), {});
  };

  GET_ResultStatus = (id: string | number): Promise<MainResponse<ResultStatus>> => {
    const url = () => `results/status/${id}`;
    return this.TP.get(url(), {});
  };

  GET_NextStep = (resultCode: number, reportingPlatforms?: string, reportYear?: number): Promise<MainResponse<GetNextStep>> => {
    const url = () => {
      const baseUrl = `results/status/workflow/result/${resultCode}/next-step`;
      const params: string[] = [];

      if (reportingPlatforms) {
        params.push(`reportingPlatforms=${reportingPlatforms}`);
      }
      if (reportYear) {
        params.push(`reportYear=${reportYear}`);
      }

      return params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
    };

    return this.TP.get(url(), {});
  };

  GET_GreenChecks = (resultCode: number, platform?: string): Promise<MainResponse<GreenChecks>> => {
    const basePath = `results/green-checks/${resultCode}`;
    const query = platform ? '?reportingPlatforms=' + platform : '';
    const url = () => basePath + query;
    return this.TP.get(url(), {});
  };

  GET_SubmitionHistory = (resultCode: number) => {
    const url = () => `results/green-checks/history/${resultCode}`;
    return this.TP.get(url(), { useResultInterceptor: true });
  };

  PATCH_StatusChangeDate = (resultCode: number, submissionHistoryId: number, newDate: string): Promise<MainResponse<unknown>> => {
    const url = () =>
      `results/green-checks/change/status/date/${resultCode}/submission-history/${submissionHistoryId}?newDate=${encodeURIComponent(newDate)}`;
    return this.TP.patch(url(), {}, { useResultInterceptor: true });
  };

  DELETE_Result = (resultCode: number) => {
    const url = () => `results/${resultCode}/delete`;
    return this.TP.delete(url(), { useResultInterceptor: true });
  };

  // Feedback | Ask for help
  PATCH_Feedback = (body: AskForHelp) => {
    const url = () => `reporting-feedback/send`;
    return this.TP.patch(url(), body);
  };

  GET_GithubVersion = () => {
    const timestamp = new Date().getTime();
    const urlWithTimestamp = `${environment.frontVersionUrl}?t=${timestamp}`;
    return this.TP.get('', { isAuth: urlWithTimestamp, noCache: true });
  };

  GET_OICRDetails = (resultCode: number | string): Promise<MainResponse<GetOICRDetails>> => {
    const url = () => `results/oicr/details/${resultCode}`;
    return this.TP.get(url(), {});
  };

  GET_OICRModal = (resultCode: number): Promise<MainResponse<OicrCreation>> => {
    const url = () => `results/oicr/${resultCode}/modal`;
    return this.TP.get(url(), {});
  };

  GET_OICRMetadata = (resultCode: number): Promise<MainResponse<OicrCreation>> => {
    const url = () => `temp/oicrs/${resultCode}/metadata`;
    return this.TP.get(url(), {});
  };

  //? >>>>>>>>>>>> Utils <<<<<<<<<<<<<<<<<

  cleanBody(body: Record<string, unknown>) {
    for (const key in body) {
      if (typeof body[key] === 'string') {
        body[key] = '';
      } else if (typeof body[key] === 'number') {
        body[key] = null;
      } else if (Array.isArray(body[key])) {
        body[key] = [];
      } else {
        body[key] = null;
      }
    }
  }

  updateSignalBody(body: WritableSignal<Record<string, unknown>>, newBody: Record<string, unknown>) {
    for (const key in newBody) {
      if (newBody[key] !== null) {
        body.update(prev => ({ ...prev, [key]: newBody[key] }));
      }
    }
  }

  private buildFindContractsParams(filters?: {
    'current-user'?: boolean;
    'contract-code'?: string;
    'project-name'?: string;
    'principal-investigator'?: string;
    lever?: string;
    status?: string;
    'start-date'?: string;
    'end-date'?: string;
    'funding-type'?: string;
    query?: string;
    page?: number | string;
    limit?: number | string;
    project?: string;
    'exclude-pooled-funding'?: boolean;
    'with-indicators'?: boolean;
    'pool-funding-contributor'?: boolean;
    'order-field'?: string;
    direction?: string;
  }): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;
    const filterKeys: (keyof typeof filters)[] = [
      'current-user',
      'contract-code',
      'project-name',
      'principal-investigator',
      'lever',
      'status',
      'start-date',
      'end-date',
      'funding-type',
      'query',
      'page',
      'limit',
      'project',
      'exclude-pooled-funding',
      'with-indicators',
      'pool-funding-contributor',
      'order-field',
      'direction'
    ];
    filterKeys.forEach(key => {
      const value = filters[key];
      if (value != null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return params;
  }

  fastResponse = (body: { prompt: string; input_text: string }) => {
    const url = () => `fast-response`;
    return this.TP.post(url(), body, { isAuth: environment.fastResponseUrl, clarisaApiKey: true });
  };

  POST_feedback = (body: InteractionFeedbackPayload) => {
    const url = () => `interactions`;
    return this.TP.post(url(), body, { isAuth: environment.feedbackUrl });
  };

  GET_LeverStrategicOutcomes = (leverId: number): Promise<MainResponse<LeverStrategicOutcome[]>> => {
    const url = () => `lever-strategic-outcome/by-lever/${leverId}`;
    return this.TP.get(url(), {});
  };

  /** SDG targets available for a lever (use with onlySdgTargets=true for target list only). */
  GET_LeverSdgTargets = (leverId: number, onlySdgTargets = true): Promise<MainResponse<LeverSdgTargetApi[]>> => {
    const q = onlySdgTargets ? '?only_sdg_targets=true' : '';
    const url = () => `lever-sdg-targets/by-lever/${leverId}${q}`;
    return this.TP.get(url(), {});
  };

  /** All center-admin lever–SDG target mapping rows (flat or nested `lever` + `sdg_target`; normalize in UI). */
  GET_LeverSdgTargetMappings = (): Promise<MainResponse<unknown[]>> => {
    return this.TP.get('lever-sdg-targets', {});
  };

  /** Create or update lever–SDG target associations (batch). */
  PATCH_LeverSdgTargets = (body: PatchLeverSdgTargetsRequest): Promise<MainResponse<unknown>> => {
    return this.TP.patch('lever-sdg-targets', body, {});
  };

  /** Remove a single lever–SDG target mapping. */
  DELETE_LeverSdgTargetMapping = (id: number): Promise<MainResponse<unknown>> => {
    return this.TP.delete(`lever-sdg-targets/${id}`, {});
  };

  GET_AutorContact = (resultCode: number): Promise<MainResponse<ContactPersonResponse | ContactPersonResponse[]>> => {
    const url = () => `result-user/author-contact/by-result/${resultCode}`;
    return this.TP.get(url(), { useResultInterceptor: true });
  };

  POST_AutorContact = (body: { user_id: number; informative_role_id: number }, resultCode: number): Promise<MainResponse<ContactPersonResponse>> => {
    const url = () => `result-user/author-contact/save-by-result/${resultCode}`;
    return this.TP.post(url(), body, {});
  };

  DELETE_AutorContact = (resultUserId: number, resultId: number) => {
    const url = () => `result-user/author-contact/${resultUserId}/by-result/${resultId}`;
    return this.TP.delete(url(), { useResultInterceptor: true });
  };
}
