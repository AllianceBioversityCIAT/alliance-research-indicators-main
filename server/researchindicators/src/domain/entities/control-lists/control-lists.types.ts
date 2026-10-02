/**
 * Client-facing (camelCase) shapes for the Control Lists API (design.md §4).
 * Entities stay snake_case to match the DB; the service maps between them.
 */

export interface ListSummary {
  id: number;
  key: string;
  name: string;
  description: string | null;
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
