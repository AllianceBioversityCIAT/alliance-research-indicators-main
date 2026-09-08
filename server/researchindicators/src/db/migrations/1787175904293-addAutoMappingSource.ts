import { MigrationInterface, QueryRunner } from 'typeorm';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-00 / NFR-CAM-004 (DD-2)
//
// Widens `bilateral_project_mapping.source` with ONE new enum value,
// `DERIVED`, for rows the CLARISA automapper (S2) creates deterministically.
//
// WHY A NEW VALUE, NOT `AI_SUGGESTED` / `AI_AUTO`
// ------------------------------------------------
// The matcher performs no inference: it strips a known prefix
// (normalizeExternalCode, closed set {B-, C-}) and looks up the derived id
// as an exact key against AGRESSO. Recording that under an AI_* value would
// be false in two directions — an admin reading the Source column would
// distrust a deterministic derivation and review what needs no review, and
// a genuinely inferential matcher built later would be indistinguishable
// from this one in the data (NFR-CAM-004, DD-2, design.md Section 3 and
// Section 12). `MANUAL`, `AI_SUGGESTED`, `AI_AUTO` are untouched — the
// latter two stay reserved for that future matcher.
//
// SCOPE
// -----
// One column MODIFY, no new column, no backfill — the 5 existing rows are
// all `MANUAL` and stay that way. The original enum ordinal set is taken
// verbatim from 1779190000011-createBilateralProjectMapping.ts.
//
// REVERT SAFETY
// -------------
// down() narrows the enum back to the original three values. That is only
// safe while no row carries `DERIVED` — reverting after the matcher has
// written rows truncates them to MySQL's enum-narrowing fallback (empty
// string) instead of failing loudly. This migration ships before the
// automapper service (T-03) writes anything, so at merge time the revert
// window is safe by construction; it stops being safe the first time apply
// runs against a non-empty cohort.
//
// PLACEHOLDER TRAP (server CLAUDE.md Section 7)
// -----------------------------------------------
// These queries pass NO parameters, so nothing in their SQL may look like a
// bind placeholder, not even inside a SQL comment. orm.config.ts sets
// extra.namedPlaceholders true; the named-placeholders pattern matches a
// bare question mark exactly as it matches a colon-word, and it has no
// notion of SQL comments. Both query strings below carry no comments at
// all, so there is nothing to trip. This comment block is TypeScript source,
// never sent to the driver, and keeps the normal form throughout.
export class AddAutoMappingSource1787175904293 implements MigrationInterface {
  name = 'AddAutoMappingSource1787175904293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `bilateral_project_mapping` MODIFY COLUMN `source` enum('MANUAL','AI_SUGGESTED','AI_AUTO','DERIVED') NOT NULL DEFAULT 'MANUAL'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `bilateral_project_mapping` MODIFY COLUMN `source` enum('MANUAL','AI_SUGGESTED','AI_AUTO') NOT NULL DEFAULT 'MANUAL'",
    );
  }
}
