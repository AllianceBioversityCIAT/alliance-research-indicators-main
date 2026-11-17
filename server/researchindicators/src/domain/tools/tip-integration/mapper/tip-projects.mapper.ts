import { TipProjectDto, TipTocMappingDto } from '../dto/response-year-tip.dto';

// @akili-spec docs/specs/changes/tip-kp-project-pool-funding — T-01 / design §7.2
export interface TipMappedContract {
  contract_id: string;
  is_primary: boolean;
}

export interface MapTipProjectsResult {
  contracts: TipMappedContract[];
  createContractId: string | null;
  poolFunding: TipTocMappingDto | null;
}

export interface TipProjectsLogger {
  warn(message: string): void;
}

const skippedAgreementWarning = (
  tipId: string | number,
  agreementId: string,
): string =>
  `TIP ${tipId}: agreement ${agreementId} not found in agresso_contracts, contract skipped`;

const unknownPrimaryWarning = (
  tipId: string | number,
  agreementId: string,
): string =>
  `TIP ${tipId}: flagged primary ${agreementId} unknown, no primary contract`;

const normaliseProjects = (
  project: TipProjectDto | TipProjectDto[] | null | undefined,
): TipProjectDto[] => {
  if (project == null) return [];
  const items = Array.isArray(project) ? project : [project];
  const deduped: TipProjectDto[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const agreementId = item?.agreement_id;
    if (agreementId == null || agreementId === '') continue;
    if (seen.has(agreementId)) continue;
    seen.add(agreementId);
    deduped.push(item);
  }
  return deduped;
};

const hasScienceProgram = (mapping: TipTocMappingDto | null | undefined) => {
  const scienceProgramId = mapping?.science_program_id;
  return typeof scienceProgramId === 'string' && scienceProgramId.trim() !== '';
};

export const mapTipProjects = (
  project: TipProjectDto | TipProjectDto[] | null | undefined,
  knownAgreementIds: ReadonlySet<string>,
  tipId: string | number,
  logger: TipProjectsLogger,
): MapTipProjectsResult => {
  const projects = normaliseProjects(project);
  const flagged = projects.find((item) => item.is_primary === true);

  let candidate: TipProjectDto | null = null;
  if (flagged) {
    if (knownAgreementIds.has(flagged.agreement_id)) {
      candidate = flagged;
    } else {
      logger.warn(unknownPrimaryWarning(tipId, flagged.agreement_id));
    }
  } else {
    candidate =
      projects.find((item) => knownAgreementIds.has(item.agreement_id)) ?? null;
  }

  const contracts: TipMappedContract[] = [];
  for (const item of projects) {
    if (!knownAgreementIds.has(item.agreement_id)) {
      logger.warn(skippedAgreementWarning(tipId, item.agreement_id));
      continue;
    }
    contracts.push({
      contract_id: item.agreement_id,
      is_primary: candidate?.agreement_id === item.agreement_id,
    });
  }

  const createContractId =
    candidate?.agreement_id ?? contracts[0]?.contract_id ?? null;

  const poolFunding =
    candidate?.is_contributing_to_pool_funding === true &&
    hasScienceProgram(candidate.toc_mapping)
      ? candidate.toc_mapping
      : null;

  return { contracts, createContractId, poolFunding };
};
