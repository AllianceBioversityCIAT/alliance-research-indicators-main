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
 *
 * `codePrefix` (D-CTL-17, T-03 rework): the proposed-code heuristic must use the SAME prefix
 * the server's `proposeNextCode` uses, not one inferred from existing codes (reviewer FAIL —
 * a code in another list's prefix could otherwise win). See `deriveNextProposedCode()` in
 * `control-lists.component.ts`.
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
  codePrefix: string;
}

/**
 * The full list entity returned by A6 (201) / A7 (design §4).
 *
 * Mirrors the server's `ControlListResponse` literally (`control-lists.types.ts`, produced by
 * `mapList()` in `control-lists.service.ts`): `{ id, categoryId, key, name,
 * description, codePrefix: string, isSystem }`. Reviewer FAIL (T-02 rework): an earlier draft
 * had `listKey` and a nullable `codePrefix` that were never on the wire — do not rename or
 * widen a field here without checking that file first.
 */
export interface ControlList {
  id: number;
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
 * tries). `categoryId` (list move, any category) is part of the A7 contract but this
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
  name: string;
  description: string | null;
  displayOrder: number;
  lists: ControlListSummary[];
}

/** A3 create body: `{name, description?}` — category names are unique module-wide (409 on a duplicate). */
export interface ControlListCategoryCreatePayload {
  name: string;
  description?: string;
}

/** A4 update body: `{name?, description?}`. */
export interface ControlListCategoryUpdatePayload {
  name?: string;
  description?: string;
}

// ─── T-03/T-04 (client half) — design §3 (permanent value ID, D-CTL-14), §4 A9–A12 ───────────
//
// Mirrors the server's `ControlListValueResponse` (`control-lists.types.ts`) literally: `{ id,
// listId, code, value, description, displayOrder, isActive, inUse }`. `inUse` is REQUIRED
// (T-04, design §4 A9 "each with inUse: number") — A9 always sends it, summed across every
// registered consumer (design §5 rule 5); it drives the values table's "In use" column.
//
// `appliesTo` / `appliesToAll` (changes/control-lists-global-scope T-02, design §4 A9–A11, A13,
// D-CLG-9, D-CLG-14): `appliesTo` holds only ACTIVE portfolio ids; `appliesToAll` is true only when
// the value has no restriction at all. `appliesToAll = false` with `appliesTo = []` therefore means
// "linked only to inactive portfolios" — offered nowhere, never to be read as "all".
export interface ControlListValue {
  id: number;
  listId: number;
  code: string;
  value: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  inUse: number;
  appliesTo: number[];
  appliesToAll: boolean;
}

/**
 * A10 create body (design §4): `{code?, value, description?, displayOrder?, isActive?}` —
 * `code` is optional because the server proposes `<prefix>-<nn>` / `L<n>` when omitted
 * (design §5 rule 4); this slice's create modal pre-fills it on the client instead (see
 * `control-lists.component.ts` for which choice — Not Done/Assumptions in the Leader's report).
 */
export interface ControlListValueCreatePayload {
  code?: string;
  value: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  /** Applies to (A10): omitted or `[]` = all portfolios; a list restricts the value. */
  portfolioIds?: number[];
}

/**
 * A11 update body (design §4) — **`id` is never sent** (D-CTL-14 / falsifier 2: whitelisting it
 * would let an update silently try to change the permanent reference).
 */
export interface ControlListValueUpdatePayload {
  code?: string;
  value?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  /** Applies to (A11): omitted = unchanged, `[]` = all portfolios, a list replaces the set. */
  portfolioIds?: number[];
}
