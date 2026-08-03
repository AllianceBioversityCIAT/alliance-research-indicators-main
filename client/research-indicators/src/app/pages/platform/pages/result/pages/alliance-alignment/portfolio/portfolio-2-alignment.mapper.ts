import { GetAllianceAlignment } from '@shared/interfaces/get-alliance-alignment.interface';
import { GetContracts, GetContractsExtended } from '@shared/interfaces/get-contracts.interface';
import { GetLevers } from '@shared/interfaces/get-levers.interface';
import { GetSdgs } from '@shared/interfaces/get-sdgs.interface';
import { PortfolioConfigItem } from '@shared/interfaces/portfolio-config.interface';
import { Lever } from '@shared/interfaces/oicr-creation.interface';
import { LeverSdgTargetOption, ResultLeverSdgTargetPayload } from '@shared/interfaces/lever-sdg-target.interface';

const OTHER_LEVER_ID = 9;

type ContractCatalogItem = GetContracts & Partial<GetContractsExtended>;
type LeverNameValue = string | { short_name?: string; name?: string };

type Portfolio2AlignmentContract = GetAllianceAlignment['contracts'][number] &
  Partial<GetContractsExtended> & {
    agresso_contract?: Partial<GetContractsExtended>;
    agreement_id?: string;
    lever?: LeverNameValue;
    lever_name?: string;
    leverUrl?: string;
    lever_url?: string;
  };

export interface Portfolio2AlignmentCatalogs {
  contracts?: ContractCatalogItem[];
  levers?: GetLevers[];
  strategicObjectives?: PortfolioConfigItem[];
  impactOutcomes?: PortfolioConfigItem[];
  sdgs?: GetSdgs[];
}

export interface Portfolio2AlignmentContractPayload {
  contract_id: string;
  is_primary: boolean;
}

export interface Portfolio2AlignmentPatchBody {
  contracts: Portfolio2AlignmentContractPayload[];
  result_sdgs: { clarisa_sdg_id: number }[];
  research_areas: { lever_id: string | number }[];
  strategic_objectives: { strategic_objective_id: number }[];
  impact_outcomes?: { impact_outcome_id: number }[];
}

const normalizeSdgs = (sdgs: GetSdgs[] | undefined): GetSdgs[] =>
  (sdgs ?? []).map(sdg => {
    const normalizedId = sdg.id ?? sdg.clarisa_sdg_id ?? (sdg as GetSdgs & { sdg_id?: number }).sdg_id ?? 0;
    return {
      ...sdg,
      id: normalizedId,
      clarisa_sdg_id: sdg.clarisa_sdg_id ?? normalizedId,
      sdg_id: (sdg as GetSdgs & { sdg_id?: number }).sdg_id ?? normalizedId
    };
  });

const normalizeResearchAreas = (areas: GetLevers[] | undefined): GetLevers[] =>
  (areas ?? []).reduce<GetLevers[]>((acc, area) => {
    const leverId = area.lever_id ?? area.id;
    if (leverId == null || String(leverId).trim() === '') return acc;

    acc.push({
      ...area,
      id: area.id ?? Number(leverId),
      lever_id: Number(leverId)
    });
    return acc;
  }, []);

export const enrichAlignmentLevers = (levers: Lever[] | undefined, catalog?: GetLevers[]): Lever[] =>
  (levers ?? []).map(lever => {
    const leverKey = String(lever.lever_id);
    const match = catalog?.find(item => String(item.lever_id ?? item.id) === leverKey);

    if (!match) {
      if (Number(lever.lever_id) !== OTHER_LEVER_ID) {
        return lever;
      }

      return {
        ...lever,
        short_name: lever.short_name ?? 'Other',
        other_names: lever.other_names ?? 'Other'
      };
    }

    return {
      ...lever,
      short_name: lever.short_name ?? match.short_name,
      other_names: lever.other_names ?? match.other_names,
      icon: lever.icon ?? match.icon ?? match.lever_url
    };
  });

export const enrichResearchAreas = (areas: GetLevers[] | undefined, catalog?: GetLevers[]): GetLevers[] =>
  normalizeResearchAreas(areas).map(area => {
    const leverKey = String(area.lever_id ?? area.id);
    const match = catalog?.find(item => String(item.lever_id ?? item.id) === leverKey);
    if (!match) return area;
    return {
      ...match,
      ...area,
      id: match.id ?? area.id,
      lever_id: match.lever_id ?? match.id ?? area.lever_id ?? area.id,
      full_name: area.full_name ?? match.full_name,
      short_name: area.short_name ?? match.short_name
    };
  });

export type AlignmentSdgTargetRow = ResultLeverSdgTargetPayload & Partial<LeverSdgTargetOption>;

const resolveSdgTargetId = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const id = record['sdg_target_id'] ?? record['id'];

  let parsed = Number.NaN;
  if (typeof id === 'number') {
    parsed = id;
  } else if (typeof id === 'string' && id !== '') {
    parsed = Number(id);
  }

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const enrichAlignmentSdgTargets = (
  targets: unknown[] | undefined,
  catalog?: LeverSdgTargetOption[]
): AlignmentSdgTargetRow[] => {
  if (!Array.isArray(targets)) return [];

  return targets
    .map(raw => {
      const sdgTargetId = resolveSdgTargetId(raw);
      if (sdgTargetId == null) return null;

      const saved = raw && typeof raw === 'object' ? (raw as AlignmentSdgTargetRow) : { sdg_target_id: sdgTargetId };
      const match = catalog?.find(item => Number(item.sdg_target_id ?? item.id) === sdgTargetId);

      if (!match) {
        return { ...saved, sdg_target_id: sdgTargetId };
      }

      return {
        ...match,
        ...saved,
        sdg_target_id: sdgTargetId,
        select_label: saved.select_label ?? match.select_label
      };
    })
    .filter((target): target is AlignmentSdgTargetRow => target != null);
};

export const enrichResultSdgs = (sdgs: GetSdgs[] | undefined, catalog?: GetSdgs[]): GetSdgs[] =>
  normalizeSdgs(sdgs)
    .map(sdg => {
      const sdgId = Number(sdg.id ?? sdg.clarisa_sdg_id);
      if (!Number.isFinite(sdgId) || sdgId <= 0) return null;

      const match = catalog?.find(
        item => Number(item.id) === sdgId || Number(item.clarisa_sdg_id) === sdgId
      );
      const withSdgId = sdg as GetSdgs & { sdg_id?: number };

      return {
        ...match,
        ...sdg,
        id: sdgId,
        clarisa_sdg_id: sdg.clarisa_sdg_id ?? match?.clarisa_sdg_id ?? sdgId,
        sdg_id: withSdgId.sdg_id ?? match?.id ?? sdgId
      } as GetSdgs;
    })
    .filter((sdg): sdg is GetSdgs => sdg != null);

const enrichPortfolioConfigItems = (
  items: PortfolioConfigItem[] | undefined,
  catalog: PortfolioConfigItem[] | undefined,
  idKey: 'strategic_objective_id' | 'impact_outcome_id'
): PortfolioConfigItem[] =>
  (items ?? [])
    .map(item => {
      const persistedId = Number((item as PortfolioConfigItem & Record<string, unknown>)[idKey] ?? item.id);
      if (!Number.isFinite(persistedId) || persistedId <= 0) return null;
      const match = catalog?.find(entry => entry.id === persistedId);
      return {
        ...match,
        ...item,
        id: persistedId,
        name: item.name ?? match?.name ?? ''
      };
    })
    .filter((item): item is PortfolioConfigItem => item != null);

const contractLookupKeys = (contract: Portfolio2AlignmentContract): string[] => {
  const keys = new Set<string>();
  if (contract.contract_id) keys.add(String(contract.contract_id));
  if (contract.agreement_id) keys.add(String(contract.agreement_id));
  return [...keys];
};

const catalogItemMatchesKeys = (catalogItem: ContractCatalogItem, keys: string[]): boolean => {
  const catalogKeys = [catalogItem.contract_id, catalogItem.agreement_id].filter(Boolean).map(String);
  return catalogKeys.some(key => keys.includes(key));
};

const resolveLeverFullName = (leverName: LeverNameValue | undefined | null): string => {
  if (!leverName) return 'Not available';
  if (typeof leverName === 'string') return leverName;
  return leverName.name ?? leverName.short_name ?? 'Not available';
};

const resolveLeverShortName = (leverName: LeverNameValue | undefined | null): string => {
  if (!leverName) return '';
  if (typeof leverName === 'string') return leverName;
  return leverName.short_name ?? leverName.name ?? '';
};

export const flattenAlignmentContract = (contract: Portfolio2AlignmentContract): Portfolio2AlignmentContract => {
  const nested = contract.agresso_contract;
  if (!nested || typeof nested !== 'object') {
    return contract;
  }

  const rest = { ...contract };
  delete rest.agresso_contract;
  return {
    ...nested,
    ...rest,
    agreement_id: nested.agreement_id ?? rest.agreement_id,
    description: nested.description ?? rest.description,
    project_lead_description: nested.project_lead_description ?? rest.project_lead_description,
    start_date: nested.start_date ?? rest.start_date,
    end_date: nested.end_date ?? rest.end_date,
    endDateGlobal: nested.endDateGlobal ?? rest.endDateGlobal,
    contract_status: nested.contract_status ?? rest.contract_status
  };
};

export const normalizeContractLevers = (
  contract: Portfolio2AlignmentContract
): GetContractsExtended['levers'] | undefined => {
  const leverData = contract.levers;
  if (leverData && typeof leverData === 'object' && !Array.isArray(leverData)) {
    return leverData;
  }
  if (Array.isArray(leverData) && leverData[0] && typeof leverData[0] === 'object') {
    return leverData[0];
  }

  const leverName = contract.lever ?? contract.lever_name;
  const leverUrl = contract.leverUrl ?? contract.lever_url;
  if (!leverName && !leverUrl) {
    return undefined;
  }

  return {
    id: contract.lever_id ?? 0,
    full_name: resolveLeverFullName(leverName),
    short_name: resolveLeverShortName(leverName),
    other_names: '',
    lever_url: leverUrl ?? ''
  };
};

export const enrichPortfolio2Contracts = (
  contracts: GetAllianceAlignment['contracts'] | undefined,
  catalog?: ContractCatalogItem[]
): GetAllianceAlignment['contracts'] =>
  (contracts ?? []).map(rawContract => {
    const flattened = flattenAlignmentContract(rawContract);
    const lookupKeys = contractLookupKeys(flattened);
    const catalogMatch = catalog?.find(item => catalogItemMatchesKeys(item, lookupKeys));

    if (catalogMatch) {
      const agreementId = catalogMatch.agreement_id ?? flattened.agreement_id ?? '';
      const description = catalogMatch.description ?? flattened.description ?? '';
      return {
        ...catalogMatch,
        ...flattened,
        agreement_id: agreementId,
        description,
        contract_id: catalogMatch.contract_id ?? agreementId,
        is_primary: Boolean(flattened.is_primary),
        select_label: catalogMatch.select_label ?? (description ? `${agreementId} - ${description}` : agreementId),
        levers: normalizeContractLevers({ ...catalogMatch, ...flattened })
      } as GetAllianceAlignment['contracts'][number];
    }

    if (flattened.agreement_id) {
      const agreementId = String(flattened.agreement_id);
      const description = flattened.description ?? '';
      return {
        ...flattened,
        contract_id: agreementId,
        select_label: flattened.select_label ?? (description ? `${agreementId} - ${description}` : agreementId),
        levers: normalizeContractLevers(flattened)
      } as GetAllianceAlignment['contracts'][number];
    }

    if (flattened.contract_id) {
      const agreementId = String(flattened.contract_id);
      return {
        ...flattened,
        agreement_id: agreementId,
        contract_id: agreementId,
        is_primary: Boolean(flattened.is_primary),
        select_label: flattened.select_label ?? agreementId,
        levers: normalizeContractLevers(flattened)
      } as GetAllianceAlignment['contracts'][number];
    }

    return {
      ...flattened,
      levers: normalizeContractLevers(flattened)
    } as GetAllianceAlignment['contracts'][number];
  });

export const normalizePortfolio2AlignmentGet = (
  data: Partial<GetAllianceAlignment> | undefined,
  catalogs: Portfolio2AlignmentCatalogs = {}
): GetAllianceAlignment => ({
  contracts: enrichPortfolio2Contracts(data?.contracts, catalogs.contracts),
  result_sdgs: enrichResultSdgs(data?.result_sdgs, catalogs.sdgs),
  primary_levers: [],
  contributor_levers: [],
  research_areas: enrichResearchAreas(data?.research_areas, catalogs.levers),
  strategic_objectives: enrichPortfolioConfigItems(
    data?.strategic_objectives,
    catalogs.strategicObjectives,
    'strategic_objective_id'
  ),
  impact_outcomes: enrichPortfolioConfigItems(data?.impact_outcomes, catalogs.impactOutcomes, 'impact_outcome_id')
});

export const buildPortfolio2AlignmentPatch = (
  body: GetAllianceAlignment,
  includeImpactOutcomes: boolean,
  includeResultSdgs = true
): Portfolio2AlignmentPatchBody => {
  const payload: Portfolio2AlignmentPatchBody = {
    contracts: (body.contracts ?? [])
      .filter(contract => contract.contract_id)
      .map(contract => ({
        contract_id: String(contract.contract_id),
        is_primary: Boolean(contract.is_primary)
      })),
    result_sdgs: includeResultSdgs
      ? normalizeSdgs(body.result_sdgs)
          .map(sdg => ({ clarisa_sdg_id: Number(sdg.clarisa_sdg_id ?? sdg.id) }))
          .filter(item => Number.isFinite(item.clarisa_sdg_id) && item.clarisa_sdg_id > 0)
      : [],
    research_areas: (body.research_areas ?? [])
      .map(area => ({ lever_id: String(area.lever_id ?? area.id) }))
      .filter(item => item.lever_id),
    strategic_objectives: (body.strategic_objectives ?? [])
      .map(item => ({
        strategic_objective_id: Number(
          (item as PortfolioConfigItem & { strategic_objective_id?: number }).strategic_objective_id ?? item.id
        )
      }))
      .filter(item => Number.isFinite(item.strategic_objective_id) && item.strategic_objective_id > 0)
  };

  if (includeImpactOutcomes) {
    payload.impact_outcomes = (body.impact_outcomes ?? [])
      .map(item => ({
        impact_outcome_id: Number((item as PortfolioConfigItem & { impact_outcome_id?: number }).impact_outcome_id ?? item.id)
      }))
      .filter(item => Number.isFinite(item.impact_outcome_id) && item.impact_outcome_id > 0);
  }

  return payload;
};
