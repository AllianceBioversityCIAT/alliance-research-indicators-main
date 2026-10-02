// @akili-spec institutional-performance/control-lists — design.md §3, §4 (A1–A5, A6–A8)
// Client-side shapes for the Control Lists module. Slice 1 (T-01) only populated
// categories; `lists` arrives as `[]` from the server before T-02. T-02 (client half)
// populates and renders it.

/**
 * A list summary as embedded in a category (design §4 A1). Populated from T-02 on.
 *
 * Mirrors the server's `ListSummary` (`control-lists.types.ts`, `mapListSummary()` in
 * `control-lists.service.ts`) literally: `{ id, key, name, description, valueCount, isSystem,
 * usedBy }`. The server does return `description` on every list summary — confirmed at
 * review (reviewer FAIL, T-02 rework) — so no reconciliation gap remains here.
 */
export interface ControlListSummary {
  id: number;
  key: string;
  name: string;
  description: string | null;
  valueCount: number;
  isSystem: boolean;
  /** Consumer names reading this list, or [] = "Not linked to a form yet" (design §5 rule 5). */
  usedBy: string[];
}

/**
 * The full list entity returned by A6 (201) / A7 (design §4).
 *
 * Mirrors the server's `ControlListResponse` literally (`control-lists.types.ts`, produced by
 * `mapList()` in `control-lists.service.ts`): `{ id, portfolioId, categoryId, key, name,
 * description, codePrefix: string, isSystem }`. Reviewer FAIL (T-02 rework): an earlier draft
 * had `listKey` and a nullable `codePrefix` that were never on the wire — do not rename or
 * widen a field here without checking that file first.
 */
export interface ControlList {
  id: number;
  portfolioId: number;
  categoryId: number;
  key: string;
  name: string;
  description: string | null;
  codePrefix: string;
  isSystem: boolean;
}

/** A6 create body: `{categoryId, listKey, name, description?, codePrefix?}` (design §4 A6). */
export interface ControlListCreatePayload {
  categoryId: number;
  listKey: string;
  name: string;
  description?: string;
  codePrefix?: string;
}

/**
 * A7 update body: `{name?, description?}` — **`listKey` is never sent** (design §4 A7,
 * §5 rule 3: the update DTO omits it so `forbidNonWhitelisted` returns 400 for a caller that
 * tries). `categoryId` (list move, same portfolio only) is part of the A7 contract but this
 * slice's UI has no control that reassigns a list's category — not built here (Not Done).
 */
export interface ControlListUpdatePayload {
  name?: string;
  description?: string;
}

/**
 * Mirrors the server's `ControlListCategoryResponse` (`control-lists.types.ts`, produced by
 * `mapCategory()` in `control-lists.service.ts`), including `displayOrder` — an earlier draft
 * dropped that field (T-02 rework, same sweep as the `ControlList` fix above).
 */
export interface ControlListCategory {
  id: number;
  portfolioId: number;
  name: string;
  description: string | null;
  displayOrder: number;
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
