// @akili-spec institutional-performance/control-lists — design.md §3, §4 (A1–A5)
// Client-side shapes for the Control Lists module. Slice 1 (T-01) only populates
// categories; `lists` always arrives as `[]` from the server until T-02 ships.

/** A list summary as embedded in a category (design §4 A1). Populated from T-02 on. */
export interface ControlListSummary {
  id: number;
  key: string;
  name: string;
  valueCount: number;
  isSystem: boolean;
  /** Consumer names reading this list, or [] = "Not linked to a form yet" (design §5 rule 5). */
  usedBy: string[];
}

export interface ControlListCategory {
  id: number;
  portfolioId: number;
  name: string;
  description: string | null;
  lists: ControlListSummary[];
}

/** A2 — drives the "(not configured)" portfolio-selector label (design §4). */
export interface ControlListPortfolioSummary {
  portfolioId: number;
  categories: number;
}

/** A3 create body: `{portfolioId, name, description?}`. */
export interface ControlListCategoryCreatePayload {
  portfolioId: number;
  name: string;
  description?: string;
}

/** A4 update body: `{name?, description?}` — no `portfolioId` (categories never move portfolios). */
export interface ControlListCategoryUpdatePayload {
  name?: string;
  description?: string;
}
