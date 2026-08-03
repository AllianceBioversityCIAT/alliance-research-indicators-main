// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// TypeScript shapes mirroring CLARISA `GET /api/cgiar-entities?version=2`,
// narrowed to the fields we consume. Source: live probe of
// https://api.clarisa.cgiar.org/api/cgiar-entities?version=2 (2026-05-28).
//
// Why this endpoint: the SP→AOW (Science Program → Area of Work) hierarchy is
// NOT reliably carried on `GET /api/projects` (a bilateral project exposes its
// SP, but its embedded AOW entries all point at the same global `parent_id`
// and cannot be resolved in-project — see bilateral.service.ts history). This
// catalog is the canonical relation: each level-2 "Key Area of Work" entry
// names its parent SP by **code** (`parent.code`, e.g. "SP02") and echoes the
// composite in `compose_code` (e.g. "SP02-AOW03"). Add upstream fields here on
// first need rather than carrying dead weight.

export interface ClarisaCgiarEntityType {
  code: number;
  name: string; // 'Science programs' | 'Key Area of Work' | 'Accelerators' | ...
}

export interface ClarisaCgiarEntityPortfolio {
  code: number;
  name: string; // e.g. 'CGIAR portfolio 2025-2030'
}

export interface ClarisaCgiarEntityParent {
  code: string; // parent SP code, e.g. 'SP02'
  name: string;
}

export interface ClarisaCgiarEntity {
  code: string; // 'SP02' (level 1) | 'AOW03' (level 2)
  name: string;
  compose_code: string; // 'SP02' (level 1) | 'SP02-AOW03' (level 2)
  level: number; // 1 = Science Program, 2 = Key Area of Work (AOW)
  is_active: number | boolean;
  entity_type: ClarisaCgiarEntityType;
  parent?: ClarisaCgiarEntityParent | null; // present on level-2 AOW entries
  portfolio?: ClarisaCgiarEntityPortfolio | null;
}

// Narrowed view returned to callers: one Area of Work under a Science Program.
export interface ClarisaAreaOfWork {
  code: string; // 'AOW03'
  name: string; // human-readable AOW name (falls back to code)
  composite_code: string; // 'SP02-AOW03'
}
