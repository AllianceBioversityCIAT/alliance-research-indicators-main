/**
 * Client mirror of the strategy-framework read/write contract (design §4).
 * Routes are unversioned `/api/strategy-framework/...`. `usageLabels` sits
 * once on the editor view, not on each element (D-STF-28).
 *
 * @akili-spec institutional-performance/strategy-framework T-12
 */

export interface FrameworkResponsible {
  carnet: string;
  name: string;
  email: string | null;
  isActiveStaff: boolean;
}

export interface FrameworkLevel {
  /** Absent on the empty editor's virtual levels (A1e). */
  id?: number;
  depth: number;
  name: string;
  pluralName: string;
  shortLabel: string;
  isIndicatorLevel: boolean;
  /** True only on the empty editor's stand-in levels. */
  virtual?: true;
}

export interface FrameworkElement {
  id: number;
  levelId: number;
  depth: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  /** Descendant counts keyed by depth. Not including the element itself. */
  descendantCounts: Record<number, number>;
  /** Indicator-level elements only, in position order. */
  responsibles?: FrameworkResponsible[];
}

export interface FrameworkBlocker {
  reason: string;
  count: number;
  wayOut: string;
}

/** Per-element editor fields. Deliberately has no `usageLabels`. */
export interface FrameworkEditorElement extends FrameworkElement {
  usage: Record<string, number>;
  deletable: boolean;
  blockers: FrameworkBlocker[];
}

export interface UsageLabel {
  consumerName: string;
  label: string;
}

export interface FrameworkView {
  portfolioId: number;
  configured: boolean;
  levels: FrameworkLevel[];
  elements: FrameworkElement[];
}

export interface FrameworkEditorView {
  portfolioId: number;
  configured: boolean;
  levels: FrameworkLevel[];
  elements: FrameworkEditorElement[];
  /** Registry labels, once for the view (D-STF-28). */
  usageLabels: UsageLabel[];
}

export interface FrameworkContextPortfolio {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  configured: boolean;
}

export interface FrameworkContext {
  currentYear: number;
  portfolios: FrameworkContextPortfolio[];
  /** Null when no portfolio is active. */
  defaultPortfolioId: number | null;
}

export interface FrameworkElementBlockers {
  children: number;
  objectives: number;
  consumers: { consumerName: string; count: number }[];
  wayOut: string[];
}

export interface FrameworkObjectiveYear {
  year: number;
  count: number;
}

export interface FrameworkObjectiveYears {
  years: FrameworkObjectiveYear[];
  defaultYear: number;
}

export interface FrameworkObjectiveElement {
  id: number;
  code: string;
  name: string;
}

export interface FrameworkObjective {
  id: number;
  portfolioId: number;
  year: number;
  code: string;
  statement: string;
  elements: FrameworkObjectiveElement[];
  deletable: boolean;
  blockers: FrameworkBlocker[];
}

export interface FrameworkStaffOption {
  carnet: string;
  name: string;
  email: string | null;
}

export interface FrameworkCodeProposal {
  code: string;
}

/** A3. `parentId` absent proposes a root. `kind: 'IOB'` needs `year`. */
export interface FrameworkCodeProposalQuery {
  portfolioId: number;
  parentId?: number;
  year?: number;
  kind?: 'IOB';
}

export type FrameworkResolveRow = FrameworkElement | { id: number; missing: true };

export interface CreateFrameworkElementPayload {
  portfolioId: number;
  parentId?: number | null;
  code?: string;
  name: string;
  description?: string | null;
  responsibleCarnets?: string[];
}

export interface UpdateFrameworkElementPayload {
  code?: string;
  name?: string;
  description?: string | null;
  /** Omitted = no move. A number moves. `null` is rejected by the service. */
  parentId?: number | null;
  responsibleCarnets?: string[];
}

export interface CreateInstitutionalObjectivePayload {
  portfolioId: number;
  year: number;
  code?: string;
  statement: string;
  elementIds?: number[];
}

export interface UpdateInstitutionalObjectivePayload {
  year?: number;
  code?: string;
  statement?: string;
  elementIds?: number[];
}

export interface CarryForwardObjectivesPayload {
  portfolioId: number;
  fromYear: number;
}

export interface CarryForwardObjectivesResult {
  fromYear: number;
  toYear: number;
  copied: number;
}

/**
 * Domain error body `GlobalExceptions` puts on `errors` (design §2.1, §4).
 * `field` on a 400/409, `blockers` on a blocked delete.
 */
export interface FrameworkErrorPayload {
  description: string;
  field?: string;
  blockers?: FrameworkBlocker[];
}
