/**
 * Client-facing (camelCase) shapes for the Control Lists API (design.md §4).
 * Entities stay snake_case to match the DB; the service maps between them.
 */

export interface ListSummary {
  id: number;
  key: string;
  name: string;
  description: string | null;
  // D-CTL-17 (T-03): the client mirrors `proposeNextCode` client-side to
  // pre-fill the proposed value code, so it needs each list's prefix too.
  codePrefix: string;
  valueCount: number;
  isSystem: boolean;
  usedBy: string[];
}

export interface ControlListCategoryResponse {
  id: number;
  portfolioId: number;
  name: string;
  description: string | null;
  displayOrder: number;
  // Populated from T-02 onward with each category's lists.
  lists: ListSummary[];
}

export interface PortfolioCategoriesSummary {
  portfolioId: number;
  categories: number;
}

export interface ControlListResponse {
  id: number;
  portfolioId: number;
  categoryId: number;
  key: string;
  name: string;
  description: string | null;
  codePrefix: string;
  isSystem: boolean;
}

// T-03 (A9–A12). `inUse` is summed across registered consumer providers
// (design §5 rule 5) — the registry does not exist until T-04, so it stays
// 0 here.
export interface ControlListValueResponse {
  id: number;
  listId: number;
  code: string;
  value: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  inUse: number;
}
