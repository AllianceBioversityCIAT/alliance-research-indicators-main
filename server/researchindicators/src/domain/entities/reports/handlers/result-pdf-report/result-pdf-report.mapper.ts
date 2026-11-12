import { AgressoContract } from '../../../agresso-contract/entities/agresso-contract.entity';
import { ResultContract } from '../../../result-contracts/entities/result-contract.entity';
import { ResultInstitution } from '../../../result-institutions/entities/result-institution.entity';
import { ResultLever } from '../../../result-levers/entities/result-lever.entity';
import { ResultLeverSdgTarget } from '../../../result-lever-sdg-targets/entities/result-lever-sdg-target.entity';
import { UpdateGeneralInformation } from '../../../results/dto/update-general-information.dto';
import { SaveGeoLocationDto } from '../../../results/dto/save-geo-location.dto';
import { CreateResultEvidenceDto } from '../../../result-evidences/dto/create-result-evidence.dto';
import { UpdateIpRightDto } from '../../../result-ip-rights/dto/update-ip-right.dto';
import { MetadataResultDto } from '../../../results/dto/metadata-result.dto';
import { LeverIcon } from '../../../../tools/clarisa/entities/clarisa-levers/enum/LeversIcons.enum';
import { resolveLeverIconUrl } from '../../../../tools/clarisa/entities/clarisa-levers/lever-icon.util';
import { ClarisaSdg } from '../../../../tools/clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';
import { Portfolio } from '../../../portfolios/entities/portfolio.entity';
import { ResultStrategicObjective } from '../../../result-strategic-objectives/entities/result-strategic-objective.entity';
import { ResultImpactOutcome } from '../../../result-impact-outcomes/entities/result-impact-outcome.entity';
import { ResultSdg } from '../../../result-sdgs/entities/result-sdg.entity';
import { IndicatorsEnum } from '../../../indicators/enum/indicators.enum';
import { PortfolioIdEnum } from '../../../results/portfolio-handlers/enum/portfolio-id.enum';
import { UpdateResultCapacitySharingDto } from '../../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultInnovationDevDto } from '../../../result-innovation-dev/dto/create-result-innovation-dev.dto';
import {
  ResultPdfReportAlignmentCatalogItem,
  ResultPdfReportAlignmentLever,
  ResultPdfReportAllianceAlignmentSection,
  ResultPdfReportLeverSdgTarget,
  ResultPdfReportSdg,
  ResultPdfReportSdgTarget,
  ResultPdfReportCapSharingLabels,
  ResultPdfReportCapSharingSection,
  ResultPdfReportContractLever,
  ResultPdfReportEvidenceSection,
  ResultPdfReportGeneralInformationSection,
  ResultPdfReportStatus,
  ResultPdfReportGeographicScopeSection,
  ResultPdfReportInnovationDetailsLabels,
  ResultPdfReportInnovationDetailsSection,
  ResultPdfReportIpRightsSection,
  ResultPdfReportLinkedResult,
  ResultPdfReportPartnerInstitution,
  ResultPdfReportPartnersSection,
} from './result-pdf-report.types';

const omitUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;

const formatPdfDate = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const getOrdinalDaySuffix = (day: number): string => {
  const lastDigit = day % 10;
  if (lastDigit === 1 && day !== 11) return 'st';
  if (lastDigit === 2 && day !== 12) return 'nd';
  if (lastDigit === 3 && day !== 13) return 'rd';
  return 'th';
};

export const formatPdfGeneratedAt = (value: Date = new Date()): string => {
  const weekday = value.toLocaleDateString('en-US', { weekday: 'long' });
  const month = value.toLocaleDateString('en-US', { month: 'long' });
  const day = value.getDate();
  const suffix = getOrdinalDaySuffix(day);
  const year = value.getFullYear();
  const time = value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${weekday}, ${month} ${day}${suffix}, ${year}, at ${time}`;
};

const mapStatusSection = (
  metadata: MetadataResultDto,
): ResultPdfReportStatus => ({
  status_name: metadata.status_name ?? metadata.result_status?.name ?? '',
  status_description: metadata.result_status?.description ?? null,
  status_border_color: metadata.result_status?.config?.color?.border ?? null,
  status_text_color: metadata.result_status?.config?.color?.text ?? null,
});

const buildMainContactDisplay = (
  mainContact?: UpdateGeneralInformation['main_contact_person'],
): string | null => {
  const user = mainContact?.user;
  if (!user) return mainContact?.user_id ?? null;
  const fullName = [user.first_name, user.last_name]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');
  const email = user.email?.trim();
  if (fullName && email) return `${fullName} (${email})`;
  return fullName || email || mainContact.user_id || null;
};

const resolveLeverIcon = (
  shortName: string | undefined,
  bucketUrl: string,
): string | undefined => {
  if (!shortName || !LeverIcon[shortName]) return undefined;
  return `${bucketUrl}/images/levers${LeverIcon[shortName]}`;
};

const mapContractLever = (
  agressoContract: AgressoContract | undefined,
  bucketUrl: string,
  leverByDepartment?: {
    id: number;
    short_name: string;
    full_name?: string;
  } | null,
): ResultPdfReportContractLever => {
  if (leverByDepartment) {
    return {
      lever_id: leverByDepartment.id,
      short_name: leverByDepartment.short_name,
      full_name: leverByDepartment.full_name ?? leverByDepartment.short_name,
      icon: resolveLeverIcon(leverByDepartment.short_name, bucketUrl),
    };
  }

  if (!agressoContract?.departmentId) {
    return { full_name: 'Not available' };
  }

  return { full_name: 'Not available' };
};

export const mapGeneralInformationSection = (
  generalInformation: UpdateGeneralInformation,
  metadata: MetadataResultDto,
  generatedAt: Date = new Date(),
): ResultPdfReportGeneralInformationSection => {
  const mainContact = generalInformation.main_contact_person;
  return {
    title: generalInformation.title,
    description: generalInformation.description,
    keywords: generalInformation.keywords ?? [],
    user_id: mainContact?.user_id ?? null,
    year: String(generalInformation.year ?? ''),
    main_contact_person: mainContact?.user_id
      ? { user_id: mainContact.user_id }
      : null,
    indicator_id: metadata.indicator_id,
    result_code: metadata.result_official_code,
    result_type: metadata.indicator_name,
    generated_at: formatPdfGeneratedAt(generatedAt),
    main_contact_display: buildMainContactDisplay(mainContact),
    status: mapStatusSection(metadata),
  };
};

export const mapGeographicScopeSection = (
  geoLocation: SaveGeoLocationDto,
): ResultPdfReportGeographicScopeSection => ({
  geo_scope_id: String(geoLocation.geo_scope_id ?? ''),
  regions: (geoLocation.regions ?? []).map((region) => ({
    region_id: region.region_id,
    name: region.region?.name ?? '',
  })),
  countries: (geoLocation.countries ?? []).map((country) => ({
    isoAlpha2: country.isoAlpha2,
    name: country.country?.name ?? '',
    result_countries_sub_nationals:
      country.result_countries_sub_nationals ?? [],
  })),
  comment_geo_scope: geoLocation.comment_geo_scope,
});

const mapSdg = (sdg: ClarisaSdg | undefined): ResultPdfReportSdg | undefined =>
  sdg
    ? omitUndefined({
        id: Number(sdg.id),
        clarisa_sdg_id: Number(sdg.id),
        smo_code: sdg.smo_code != null ? Number(sdg.smo_code) : undefined,
        financial_code: sdg.financial_code ?? undefined,
        short_name: sdg.short_name ?? undefined,
        full_name: sdg.full_name ?? undefined,
        icon: sdg.icon ?? undefined,
        color: sdg.color ?? undefined,
        description: sdg.description ?? undefined,
      })
    : undefined;

const mapSdgTarget = (target: ResultLeverSdgTarget): ResultPdfReportSdgTarget =>
  omitUndefined({
    sdg_target_id: Number(target.sdg_target_id),
    sdg_target_code: target.sdg_target?.sdg_target_code ?? undefined,
    sdg_target: target.sdg_target?.sdg_target ?? undefined,
    clarisa_sdg: mapSdg(target.sdg_target?.clarisa_sdg),
  });

const mapLeverSdgTarget = (
  target: ResultLeverSdgTarget,
): ResultPdfReportLeverSdgTarget => ({
  result_lever_sdg_target_id: target.result_lever_sdg_target_id,
  result_lever_id: target.result_lever_id,
  ...mapSdgTarget(target),
});

const isActiveRow = (row: { is_active?: boolean }): boolean =>
  row?.is_active !== false;

/**
 * The catalog row's own `icon` when it is already a URL; otherwise the lever artwork
 * the rest of STAR resolves from the name. `leverId` is passed for Portfolio 1 only:
 * there "Lever N" is the lever id, while Portfolio 2 Research Areas have their own ids.
 */
const resolveAlignmentLeverIcon = (
  lever: ResultLever['lever'],
  bucketUrl: string,
  leverId?: number,
): string | null => {
  const catalogIcon = lever?.icon?.trim();
  if (catalogIcon && /^https?:\/\//i.test(catalogIcon)) return catalogIcon;
  return resolveLeverIconUrl(bucketUrl, {
    shortName: lever?.short_name,
    fullName: lever?.full_name,
    leverId,
  });
};

const mapAlignmentLever = (
  lever: ResultLever,
  bucketUrl: string,
  options: {
    isPortfolio1: boolean;
    withStrategicOutcomes: boolean;
    withSdgTargets: boolean;
  },
): ResultPdfReportAlignmentLever => {
  const strategicOutcomes = options.withStrategicOutcomes
    ? (lever.result_lever_strategic_outcomes ?? [])
        .filter(isActiveRow)
        .map((outcome) =>
          omitUndefined({
            lever_strategic_outcome_id: outcome.lever_strategic_outcome_id,
            strategic_outcome:
              outcome.lever_strategic_outcome?.strategic_outcome ?? undefined,
          }),
        )
    : [];
  const sdgTargets = options.withSdgTargets
    ? (lever.result_lever_sdg_targets ?? [])
        .filter(isActiveRow)
        .map(mapLeverSdgTarget)
    : [];

  return omitUndefined({
    result_lever_id: lever.result_lever_id,
    result_id: lever.result_id,
    lever_id: lever.lever_id,
    lever_role_id: lever.lever_role_id,
    is_primary: lever.is_primary,
    short_name: lever.lever?.short_name ?? undefined,
    full_name: lever.lever?.full_name ?? undefined,
    other_names: lever.lever?.other_names ?? undefined,
    icon: resolveAlignmentLeverIcon(
      lever.lever,
      bucketUrl,
      options.isPortfolio1 ? Number(lever.lever_id) : undefined,
    ),
    custom_lever_name: lever.custom_lever_name?.trim() || undefined,
    ...(strategicOutcomes.length
      ? { result_lever_strategic_outcomes: strategicOutcomes }
      : {}),
    ...(sdgTargets.length ? { result_lever_sdg_targets: sdgTargets } : {}),
  });
};

const mapAlignmentContract = (
  contract: ResultContract,
  bucketUrl: string,
  leverByDepartmentId: AllianceAlignmentPdfSource['leverByDepartmentId'],
) => {
  const agresso = contract.agresso_contract;
  const departmentKey = agresso?.departmentId?.trim();
  const leverFromDepartment = departmentKey
    ? leverByDepartmentId.get(departmentKey)
    : null;
  return omitUndefined({
    is_active: contract.is_active,
    result_contract_id: contract.result_contract_id,
    result_id: contract.result_id,
    contract_id: contract.contract_id,
    contract_role_id: contract.contract_role_id,
    is_primary: contract.is_primary,
    agreement_id: agresso?.agreement_id ?? contract.contract_id,
    description: agresso?.description,
    contract_status: agresso?.contract_status,
    project_lead_description: agresso?.project_lead_description,
    start_date: formatPdfDate(agresso?.start_date),
    end_date: formatPdfDate(agresso?.end_date),
    endDateGlobal: formatPdfDate(agresso?.endDateGlobal),
    levers: mapContractLever(agresso, bucketUrl, leverFromDepartment),
  });
};

const mapAlignmentCatalogItem = (item?: {
  id: number;
  name: string;
  description?: string;
}): ResultPdfReportAlignmentCatalogItem | undefined =>
  item
    ? omitUndefined({
        id: Number(item.id),
        name: item.name,
        description: item.description ?? undefined,
      })
    : undefined;

const IMPACT_OUTCOME_INDICATORS: number[] = [
  IndicatorsEnum.POLICY_CHANGE,
  IndicatorsEnum.OICR,
  IndicatorsEnum.INNOVATION_USE,
];

export type AllianceAlignmentPdfSource = {
  indicatorId: number;
  /** Resolved from the reporting year against the `portfolios` table. */
  portfolio: Portfolio | null;
  contracts: ResultContract[];
  /** `result_levers` at role ALIGNMENT (Portfolio 1 levers). */
  levers: ResultLever[];
  /** `result_levers` at role RESEARCH_AREAS_ALIGNMENT (Portfolio 2). */
  researchAreas: ResultLever[];
  strategicObjectives: ResultStrategicObjective[];
  impactOutcomes: ResultImpactOutcome[];
  /** Result-level SDG targets (Portfolio 2 OICR, `result_lever_id` NULL). */
  resultSdgTargets: ResultLeverSdgTarget[];
  resultSdgs: ResultSdg[];
  bucketUrl: string;
  leverByDepartmentId: Map<
    string,
    { id: number; short_name: string; full_name?: string }
  >;
};

/**
 * Sends only the blocks the result's portfolio and indicator show in STAR's Alliance
 * Alignment section: levers on Portfolio 1; Research Areas, Strategic Objectives,
 * Impact Outcomes (indicators 4, 5, 6) and result SDG targets (OICR) on Portfolio 2;
 * Contribution to SDG on every indicator but OICR.
 */
export const mapAllianceAlignmentSection = (
  source: AllianceAlignmentPdfSource,
): ResultPdfReportAllianceAlignmentSection => {
  const { indicatorId, portfolio, bucketUrl } = source;
  const isOicr = Number(indicatorId) === IndicatorsEnum.OICR;
  const isPortfolio2 = Number(portfolio?.id) === PortfolioIdEnum.PORTFOLIO_2;

  const section: ResultPdfReportAllianceAlignmentSection = {
    indicator_id: indicatorId,
    portfolio: portfolio
      ? omitUndefined({
          id: Number(portfolio.id),
          name: portfolio.name,
          description: portfolio.description ?? undefined,
          start_year: Number(portfolio.start_year),
          end_year: Number(portfolio.end_year),
        })
      : null,
    contracts: source.contracts.map((contract) =>
      mapAlignmentContract(contract, bucketUrl, source.leverByDepartmentId),
    ),
    result_sdgs: isOicr
      ? []
      : source.resultSdgs.map((row) => mapSdg(row.clarisa_sdg)).filter(Boolean),
  };

  if (isPortfolio2) {
    section.research_areas = source.researchAreas.map((lever) =>
      mapAlignmentLever(lever, bucketUrl, {
        isPortfolio1: false,
        withStrategicOutcomes: false,
        withSdgTargets: false,
      }),
    );
    section.strategic_objectives = source.strategicObjectives
      .map((row) => mapAlignmentCatalogItem(row.strategic_objective))
      .filter(Boolean);
    if (IMPACT_OUTCOME_INDICATORS.includes(Number(indicatorId))) {
      section.impact_outcomes = source.impactOutcomes
        .map((row) => mapAlignmentCatalogItem(row.impact_outcome))
        .filter(Boolean);
    }
    if (isOicr) {
      section.result_sdg_targets = source.resultSdgTargets.map(mapSdgTarget);
    }
    return section;
  }

  const mapLever = (lever: ResultLever) =>
    mapAlignmentLever(lever, bucketUrl, {
      isPortfolio1: true,
      withStrategicOutcomes: isOicr && lever.is_primary,
      withSdgTargets: isOicr,
    });
  section.primary_levers = source.levers
    .filter((lever) => lever.is_primary)
    .map(mapLever);
  section.contributor_levers = source.levers
    .filter((lever) => !lever.is_primary)
    .map(mapLever);
  return section;
};

export const mapEvidenceSection = (
  evidence: CreateResultEvidenceDto,
): ResultPdfReportEvidenceSection =>
  omitUndefined({
    evidence: evidence.evidence ?? [],
    notable_references: evidence.notable_references ?? [],
    ...(evidence.cgspace_link !== undefined && evidence.cgspace_link !== null
      ? { cgspace_link: evidence.cgspace_link }
      : {}),
  });

const resolveHeadquarters = (
  institution: ResultInstitution['institution'],
): string | null => {
  const locations = institution?.institution_locations ?? [];
  const headquarters =
    locations.find((location) => location.isHeadquarter) ?? locations[0];
  return headquarters?.name ?? headquarters?.country?.name ?? null;
};

export const mapInstitutionItems = (
  institutions: ResultInstitution[],
): ResultPdfReportPartnerInstitution[] =>
  institutions.map((item) => ({
    institution_id: item.institution_id,
    institution_role_id: item.institution_role_id,
    acronym: item.institution?.acronym,
    name: item.institution?.name,
    institution_type_name: item.institution?.institution_type?.name,
    headquarters: resolveHeadquarters(item.institution),
  }));

export const mapPartnersSection = (
  institutions: ResultInstitution[],
  isPartnerNotApplicable: boolean | null,
): ResultPdfReportPartnersSection => ({
  is_partner_not_applicable: isPartnerNotApplicable,
  institutions: mapInstitutionItems(institutions),
});

export const mapCapSharingSection = (
  capSharing: Partial<UpdateResultCapacitySharingDto>,
  labels: ResultPdfReportCapSharingLabels,
): ResultPdfReportCapSharingSection =>
  omitUndefined({
    delivery_modality_id: capSharing.delivery_modality_id,
    end_date: capSharing.end_date,
    session_format_id: capSharing.session_format_id,
    session_type_id: capSharing.session_type_id,
    start_date: capSharing.start_date,
    degree_id: capSharing.degree_id,
    session_length_id: capSharing.session_length_id,
    ...(capSharing.individual ? { individual: capSharing.individual } : {}),
    ...(capSharing.group ? { group: capSharing.group } : {}),
    ...(capSharing.training_supervisor !== undefined
      ? { training_supervisor: capSharing.training_supervisor }
      : {}),
    ...(capSharing.training_supervisor_languages !== undefined
      ? {
          training_supervisor_languages:
            capSharing.training_supervisor_languages,
        }
      : {}),
    ...labels,
  });

export const mapYesNoLabel = (
  value?: boolean | number | null,
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return value ? 'Yes' : 'No';
};

export const mapInnovationDetailsSection = (
  innovation: CreateResultInnovationDevDto,
  labels: ResultPdfReportInnovationDetailsLabels,
  linkedResults: ResultPdfReportLinkedResult[],
): ResultPdfReportInnovationDetailsSection =>
  omitUndefined({
    ...innovation,
    knowledge_sharing_form: innovation.knowledge_sharing_form
      ? { ...innovation.knowledge_sharing_form, link_to_result: linkedResults }
      : undefined,
    ...labels,
  });

export const mapIpRightsSection = (
  ipRights: UpdateIpRightDto | null | undefined,
): ResultPdfReportIpRightsSection => ({
  asset_ip_owner_description: ipRights?.asset_ip_owner_description ?? null,
  publicity_restriction: ipRights?.publicity_restriction ?? null,
  requires_futher_development: ipRights?.requires_futher_development ?? null,
  asset_ip_owner: ipRights?.asset_ip_owner ?? null,
  potential_asset: ipRights?.potential_asset ?? null,
  potential_asset_description: ipRights?.potential_asset_description ?? null,
  publicity_restriction_description:
    ipRights?.publicity_restriction_description ?? null,
  requires_futher_development_description:
    ipRights?.requires_futher_development_description ?? null,
  private_sector_engagement_id: ipRights?.private_sector_engagement_id ?? null,
  formal_ip_rights_application_id:
    ipRights?.formal_ip_rights_application_id ?? null,
});
