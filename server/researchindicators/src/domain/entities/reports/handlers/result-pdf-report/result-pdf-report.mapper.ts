import { AgressoContract } from '../../../agresso-contract/entities/agresso-contract.entity';
import { ResultContract } from '../../../result-contracts/entities/result-contract.entity';
import { ResultInstitution } from '../../../result-institutions/entities/result-institution.entity';
import { ResultLever } from '../../../result-levers/entities/result-lever.entity';
import { UpdateGeneralInformation } from '../../../results/dto/update-general-information.dto';
import { SaveGeoLocationDto } from '../../../results/dto/save-geo-location.dto';
import { ResultAlignmentDto } from '../../../results/dto/result-alignment.dto';
import { CreateResultEvidenceDto } from '../../../result-evidences/dto/create-result-evidence.dto';
import { UpdateIpRightDto } from '../../../result-ip-rights/dto/update-ip-right.dto';
import { MetadataResultDto } from '../../../results/dto/metadata-result.dto';
import { LeverIcon } from '../../../../tools/clarisa/entities/clarisa-levers/enum/LeversIcons.enum';
import {
  ResultPdfReportAllianceAlignmentSection,
  ResultPdfReportContractLever,
  ResultPdfReportEvidenceSection,
  ResultPdfReportGeneralInformationSection,
  ResultPdfReportGeographicScopeSection,
  ResultPdfReportIpRightsSection,
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

export const formatPdfGeneratedAt = (value: Date = new Date()): string => {
  const weekday = value.toLocaleDateString('en-US', { weekday: 'long' });
  const month = value.toLocaleDateString('en-US', { month: 'long' });
  const day = value.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';
  const year = value.getFullYear();
  const time = value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${weekday}, ${month} ${day}${suffix}, ${year}, at ${time}`;
};

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

const mapAlignmentLever = (
  lever: ResultLever,
  bucketUrl: string,
): ResultPdfReportAllianceAlignmentSection['primary_levers'][number] => {
  const strategicOutcomes = lever.result_lever_strategic_outcomes ?? [];
  const sdgTargets = lever.result_lever_sdg_targets ?? [];

  return omitUndefined({
    result_lever_id: lever.result_lever_id,
    result_id: lever.result_id,
    lever_id: lever.lever_id,
    lever_role_id: lever.lever_role_id,
    is_primary: lever.is_primary,
    short_name: lever.lever?.short_name,
    icon: resolveLeverIcon(lever.lever?.short_name, bucketUrl) ?? null,
    ...(strategicOutcomes.length
      ? { result_lever_strategic_outcomes: strategicOutcomes }
      : {}),
    ...(sdgTargets.length ? { result_lever_sdg_targets: sdgTargets } : {}),
  });
};

export const mapAllianceAlignmentSection = (
  alignment: ResultAlignmentDto,
  indicatorId: number,
  contractsWithAgresso: ResultContract[],
  leversWithRelations: ResultLever[],
  bucketUrl: string,
  leverByDepartmentId: Map<string, { id: number; short_name: string; full_name?: string }>,
): ResultPdfReportAllianceAlignmentSection => {
  const leverMap = new Map(
    leversWithRelations.map((lever) => [lever.result_lever_id, lever]),
  );

  const enrichLever = (lever: ResultLever) =>
    mapAlignmentLever(leverMap.get(lever.result_lever_id) ?? lever, bucketUrl);

  const contracts = contractsWithAgresso.map((contract) => {
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
  });

  return {
    indicator_id: indicatorId,
    contracts,
    result_sdgs: alignment.result_sdgs ?? [],
    primary_levers: (alignment.primary_levers ?? []).map(enrichLever),
    contributor_levers: (alignment.contributor_levers ?? []).map(enrichLever),
  };
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

export const mapPartnersSection = (
  institutions: ResultInstitution[],
  isPartnerNotApplicable: boolean | null,
): ResultPdfReportPartnersSection => ({
  is_partner_not_applicable: isPartnerNotApplicable,
  institutions: institutions.map((item) => ({
    institution_id: item.institution_id,
    institution_role_id: item.institution_role_id,
    acronym: item.institution?.acronym,
    name: item.institution?.name,
    institution_type_name: item.institution?.institution_type?.name,
    headquarters: resolveHeadquarters(item.institution),
  })),
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
