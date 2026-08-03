// Shared fixtures for the Center Admin → Bilateral Project Mapping feature.
// @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (T-BIL-CAM-07)
//
// Typed against `@interfaces/bilateral/bilateral-project-mapping.interface`.
// These are the canonical sample objects for the service/component specs so new
// tests don't re-mock the wire shapes per file (see .agents/implementer.md
// "Tests" convention). Follows the style of `toc-catalog.fixture.ts`.

import {
  BilateralProjectMapping,
  BilateralMappingListPage,
  ClarisaBilateralProjectOption
} from '@interfaces/bilateral/bilateral-project-mapping.interface';

/**
 * A single MANUAL bilateral project mapping (the default operator-created shape:
 * `source: 'MANUAL'`, no confidence score). Pass `overrides` to vary a field.
 */
export function mockBilateralMapping(overrides: Partial<BilateralProjectMapping> = {}): BilateralProjectMapping {
  return {
    id: 11,
    agresso_agreement_id: 'D504',
    clarisa_project_id: 22,
    clarisa_project_short_name: 'ACIAR',
    source: 'MANUAL',
    confidence_score: null,
    notes: null,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    created_by: 1,
    updated_by: 1,
    ...overrides
  };
}

/**
 * A `{ items, meta }` list page envelope. `meta` is derived from the item count
 * and the supplied `total` so callers can build single- or multi-page fixtures.
 */
export function mockBilateralMappingListPage(
  items: BilateralProjectMapping[] = [mockBilateralMapping()],
  total = items.length,
  limit = 20
): BilateralMappingListPage {
  return {
    items,
    meta: { total, page: 1, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

/**
 * A CLARISA bilateral project picker option, including a science-program
 * allocation so SP-preview rendering can be exercised.
 */
export function mockClarisaBilateralProjectOption(
  overrides: Partial<ClarisaBilateralProjectOption> = {}
): ClarisaBilateralProjectOption {
  return {
    id: 22,
    short_name: 'ACIAR',
    source_of_funding: 'BILATERAL',
    science_programs: [{ code: 'SP1', name: 'Food Systems', portfolio: 'Genetic Innovation', allocation: 60 }],
    ...overrides
  };
}
