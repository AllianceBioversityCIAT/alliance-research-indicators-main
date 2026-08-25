import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { ContractClarisaProject } from '@shared/interfaces/contract-clarisa-project.interface';
import { ContractDashboardReport } from '@shared/interfaces/contract-dashboard.interface';

/**
 * @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-03 / R-EOC-002, design.md §5.1
 *
 * Pure, deterministic builder for the Executive Overview generation request's `project_context`
 * digest. No `Date.now()`, no locale-dependent formatting — dates and amounts are emitted as the
 * raw strings/numbers the source data carries, so the same inputs always produce the same output.
 *
 * Section order is fixed: [PROJECT] [CONTRACT] [RESULTS ANALYTICS] [REACH] [STRATEGY]. Per-field
 * CLARISA preference (R-EOC-002 AC.2): where CLARISA and Agresso both carry a PROJECT field
 * (description/summary, dates, budget, funder, lead), CLARISA wins whenever the CLARISA project
 * block is non-null; the section header names which source won. CONTRACT is Agresso-only by design
 * (agreement id, funding type, grant/center amounts, division/unit, SDGs, CGIAR entities — fields
 * CLARISA does not carry). RESULTS ANALYTICS / REACH / STRATEGY are STAR-analytics sections sourced
 * from the dashboard report; STRATEGY also folds in CLARISA Science-Program allocations when mapped.
 */

const MAX_CONTEXT_CHARS = 8_000;

export interface ProjectContextProvenance {
  projectSource: 'clarisa' | 'agresso';
  sections: string[];
}

export interface ProjectContextResult {
  text: string;
  provenance: ProjectContextProvenance;
}

interface ContextSection {
  name: string;
  text: string;
}

export function buildProjectContext(
  project: GetProjectDetail | null,
  clarisaProject: ContractClarisaProject | null,
  dashboard: ContractDashboardReport | null
): ProjectContextResult | undefined {
  const sections: ContextSection[] = [];

  const projectSection = buildProjectSection(project, clarisaProject);
  if (projectSection) sections.push(projectSection);

  const contractSection = buildContractSection(project);
  if (contractSection) sections.push(contractSection);

  const resultsSection = buildResultsAnalyticsSection(dashboard);
  if (resultsSection) sections.push(resultsSection);

  const reachSection = buildReachSection(dashboard);
  if (reachSection) sections.push(reachSection);

  const strategySection = buildStrategySection(dashboard, clarisaProject);
  if (strategySection) sections.push(strategySection);

  if (sections.length === 0) {
    return undefined;
  }

  const { text, includedSections } = boundSections(sections);

  return {
    text,
    provenance: {
      projectSource: clarisaProject ? 'clarisa' : 'agresso',
      sections: includedSections
    }
  };
}

// --- Section builders -------------------------------------------------------------------------

function buildProjectSection(project: GetProjectDetail | null, clarisaProject: ContractClarisaProject | null): ContextSection | undefined {
  if (!project && !clarisaProject) {
    return undefined;
  }

  const sourceLabel = clarisaProject ? 'CLARISA (updated)' : 'Agresso';
  const lines: string[] = [`[PROJECT — source: ${sourceLabel}]`];

  const title = clarisaProject?.full_name ?? clarisaProject?.short_name ?? project?.full_name;
  if (title) lines.push(`Title: ${title}`);

  const description = clarisaProject?.description ?? clarisaProject?.summary ?? project?.description ?? project?.projectDescription;
  if (description) lines.push(`Description: ${description}`);

  const startDate = clarisaProject?.start_date ?? project?.start_date;
  const endDate = clarisaProject?.end_date ?? project?.end_date;
  if (startDate || endDate) {
    lines.push(`Dates: ${startDate ?? 'unknown'} to ${endDate ?? 'unknown'}`);
  }

  const budget = formatProjectBudget(clarisaProject, project);
  if (budget) lines.push(`Budget: ${budget}`);

  const funder = clarisaProject?.funder_institution?.name ?? project?.donor;
  if (funder) lines.push(`Funder: ${funder}`);

  const lead = clarisaProject?.lead_institution?.name ?? project?.project_lead_description;
  if (lead) lines.push(`Lead: ${lead}`);

  if (lines.length === 1) {
    // Header only — neither source carried a usable PROJECT field.
    return undefined;
  }

  return { name: 'PROJECT', text: lines.join('\n') };
}

function formatProjectBudget(clarisaProject: ContractClarisaProject | null, project: GetProjectDetail | null): string | undefined {
  if (clarisaProject?.total_budget) {
    return clarisaProject.annual ? `${clarisaProject.total_budget} (annual: ${clarisaProject.annual})` : clarisaProject.total_budget;
  }

  const grantUsd = formatAmount(project?.grant_amount_usd);
  if (grantUsd) {
    return `${grantUsd} USD`;
  }

  return formatAmount(project?.grant_amount);
}

function buildContractSection(project: GetProjectDetail | null): ContextSection | undefined {
  if (!project) {
    return undefined;
  }

  const lines: string[] = ['[CONTRACT — source: Agresso]'];

  if (project.agreement_id) lines.push(`Agreement ID: ${project.agreement_id}`);
  if (project.funding_type) lines.push(`Funding type: ${project.funding_type}`);

  const grantAmount = formatAmount(project.grant_amount_usd);
  const centerAmount = formatAmount(project.center_amount_usd);
  if (grantAmount || centerAmount) {
    const parts: string[] = [];
    if (grantAmount) parts.push(`grant ${grantAmount} USD`);
    if (centerAmount) parts.push(`center ${centerAmount} USD`);
    lines.push(`Grant/center amounts: ${parts.join(', ')}`);
  }

  if (project.division || project.unit) {
    lines.push(`Division/Unit: ${[project.division, project.unit].filter(Boolean).join(' / ')}`);
  }

  const sdgs = (project.sdgs ?? []).filter((sdg): sdg is string | number => sdg !== null && sdg !== undefined);
  if (sdgs.length > 0) {
    lines.push(`SDGs: ${sdgs.join(', ')}`);
  }

  const entities = (project.cgiar_entities ?? [])
    .map(entity => entity.name ?? entity.code)
    .filter((name): name is string => Boolean(name));
  if (entities.length > 0) {
    lines.push(`CGIAR entities: ${entities.join(', ')}`);
  }

  if (lines.length === 1) {
    return undefined;
  }

  return { name: 'CONTRACT', text: lines.join('\n') };
}

function buildResultsAnalyticsSection(dashboard: ContractDashboardReport | null): ContextSection | undefined {
  const summary = dashboard?.summary;
  if (!summary) {
    return undefined;
  }

  const lines: string[] = ['[RESULTS ANALYTICS — source: STAR]'];
  lines.push(`Total results: ${summary.total}`);

  if (summary.by_status?.length) {
    lines.push(`By status: ${summary.by_status.map(bucket => `${bucket.name}: ${bucket.count}`).join(', ')}`);
  }

  if (summary.by_year?.length) {
    lines.push(`By year: ${summary.by_year.map(bucket => `${bucket.year ?? 'unknown'}: ${bucket.count}`).join(', ')}`);
  }

  const indicatorIds = new Set((summary.by_indicator_year ?? []).map(bucket => bucket.indicator_id));
  if (indicatorIds.size > 0) {
    lines.push(`Indicators covered: ${indicatorIds.size}`);
  }

  return { name: 'RESULTS ANALYTICS', text: lines.join('\n') };
}

function buildReachSection(dashboard: ContractDashboardReport | null): ContextSection | undefined {
  const lines: string[] = ['[REACH — source: STAR]'];

  const partners = dashboard?.tops?.partners ?? [];
  const partnerNames = partners
    .map(partner => partner.institution_name ?? partner.partner_name ?? partner.name ?? partner.label)
    .filter((name): name is string => Boolean(name));
  if (partnerNames.length > 0) {
    lines.push(`Top partner institutions: ${partnerNames.join(', ')}`);
  }

  const geoSummary = dashboard?.geo_scope?.geo_scope_summary;
  if (geoSummary) {
    const parts = Object.entries(geoSummary)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
      .map(([scope, count]) => `${scope.replace(/_/g, ' ')}: ${count}`);
    if (parts.length > 0) {
      lines.push(`Geo scope: ${parts.join(', ')}`);
    }
  }

  if (lines.length === 1) {
    return undefined;
  }

  return { name: 'REACH', text: lines.join('\n') };
}

function buildStrategySection(
  dashboard: ContractDashboardReport | null,
  clarisaProject: ContractClarisaProject | null
): ContextSection | undefined {
  const alignment = dashboard?.sp_alignment;
  const scienceProgramAllocations = clarisaProject?.science_programs ?? [];

  if (!alignment && scienceProgramAllocations.length === 0) {
    return undefined;
  }

  const lines: string[] = ['[STRATEGY — source: STAR]'];

  if (alignment) {
    lines.push(`Results with SP alignment: ${alignment.results_with_alignment}, without: ${alignment.results_without_alignment}`);
    const spCodes = (alignment.sps ?? []).map(sp => sp.sp_code).filter(Boolean);
    if (spCodes.length > 0) {
      lines.push(`SP codes: ${spCodes.join(', ')}`);
    }
  }

  if (scienceProgramAllocations.length > 0) {
    lines.push(`CLARISA SP allocations: ${scienceProgramAllocations.map(sp => `${sp.code} (${sp.allocation})`).join(', ')}`);
  }

  return { name: 'STRATEGY', text: lines.join('\n') };
}

function formatAmount(value: string | number | null | undefined): string | undefined {
  return value !== null && value !== undefined && value !== '' ? `${value}` : undefined;
}

// --- Bounding (R-EOC-002 AC.3: ≤ 8,000 chars, truncated at section boundaries, never mid-sentence)

function boundSections(sections: ContextSection[]): { text: string; includedSections: string[] } {
  let candidate = sections;
  while (candidate.length > 1 && joinSections(candidate).length > MAX_CONTEXT_CHARS) {
    candidate = candidate.slice(0, -1);
  }

  const joined = joinSections(candidate);
  if (joined.length <= MAX_CONTEXT_CHARS) {
    return { text: joined, includedSections: candidate.map(section => section.name) };
  }

  // Only one section remains (always the first — [PROJECT] when present, R-EOC-002 AC.3) and it
  // alone still exceeds the bound: truncate its own text at the last sentence boundary, never
  // mid-sentence.
  const onlySection = candidate[0];
  return {
    text: truncateAtSentenceBoundary(onlySection.text, MAX_CONTEXT_CHARS),
    includedSections: [onlySection.name]
  };
}

function joinSections(sections: ContextSection[]): string {
  return sections.map(section => section.text).join('\n\n');
}

function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  const slice = text.slice(0, maxChars);
  const sentenceEndPattern = /[.!?](?=\s|$)/g;
  let lastBoundary = -1;
  let match: RegExpExecArray | null;
  while ((match = sentenceEndPattern.exec(slice)) !== null) {
    lastBoundary = match.index + 1;
  }

  if (lastBoundary > 0) {
    return slice.slice(0, lastBoundary).trimEnd();
  }

  // No sentence boundary within range — fall back to the last whitespace so a word is never split.
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
}
