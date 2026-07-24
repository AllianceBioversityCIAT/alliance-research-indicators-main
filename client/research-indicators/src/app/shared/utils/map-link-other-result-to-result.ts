import { Result } from '@interfaces/result/result.interface';
import { OtherResultLinkPayload } from '@interfaces/link-results.interface';
import { ResultStatus } from '@interfaces/result-config.interface';

function buildResultStatusFromLinkPayload(other: OtherResultLinkPayload): ResultStatus | undefined {
  if (other.result_status) {
    return {
      result_status_id: other.result_status.result_status_id,
      name: other.result_status.name,
      description: other.result_status.description,
      action_description: other.result_status.action_description,
      editable_roles: other.result_status.editable_roles ?? undefined,
      config: other.result_status.config
    };
  }
  if (typeof other.result_status_id === 'number') {
    return {
      result_status_id: other.result_status_id,
      name: other.status_name,
      description: other.status_description,
      config: other.status_config
    };
  }
  return undefined;
}

function buildIndicatorsFromLinkPayload(other: OtherResultLinkPayload): Result['indicators'] {
  if (other.indicator) {
    return { name: other.indicator.name ?? '', icon_src: other.indicator.icon_src ?? '' };
  }
  if (other.indicator_name) {
    return { name: other.indicator_name, icon_src: other.indicator_icon_src ?? '' };
  }
  return undefined;
}

export function mapOtherResultLinkPayloadToResult(other: OtherResultLinkPayload): Result {
  const contracts = other.result_contracts;
  const primary = Array.isArray(contracts) ? (contracts.find(c => Number(c.is_primary) === 1) ?? contracts[0]) : undefined;
  const projectLabel = primary?.agresso_contract?.description ?? primary?.agresso_contract?.short_title ?? undefined;

  const resultStatus = buildResultStatusFromLinkPayload(other);
  const indicators = buildIndicatorsFromLinkPayload(other);

  return {
    is_active: other.is_active ?? true,
    result_id: other.result_id,
    result_platform: other.platform_code ?? '',
    result_official_code: String(other.result_official_code ?? ''),
    version_id: null,
    title: other.title ?? '',
    platform_code: other.platform_code ?? '',
    external_link: other.external_link ?? undefined,
    public_link: other.public_link ?? undefined,
    description: other.description ?? null,
    indicator_id: other.indicator?.indicator_id ?? other.indicator_id ?? 0,
    geo_scope_id: null,
    indicators,
    result_status: resultStatus,
    result_contracts: primary?.contract_id
      ? {
          contract_id: primary.contract_id,
          is_primary: Number(primary.is_primary) || 1,
          contract: projectLabel ? { description: projectLabel } : undefined
        }
      : undefined,
    report_year_id: other.report_year_id
  };
}
