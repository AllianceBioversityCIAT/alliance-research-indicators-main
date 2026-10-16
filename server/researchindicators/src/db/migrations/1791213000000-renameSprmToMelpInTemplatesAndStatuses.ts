import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the SPRM wording to MELP in the two places the database owns the
 * user-facing copy: `sec_template.template` (the email bodies) and
 * `result_status` (`description` / `action_description`, rendered in the
 * OICR submission UI).
 *
 * Companion to the client-side rename in commit `6d3a268e`
 * (`refactor(client): rename SPRM to MELP in user-facing text`). Until this
 * migration is applied, the OICR Accepted status description and the
 * submission toast disagree on screen: the toast already reads "MELP", the
 * status text still reads "PISA-SPRM".
 *
 * ## Rules applied
 *
 * - `SPRM` -> `MELP`, preserving case. Every occurrence found is uppercase.
 * - `PISA-SPRM` collapses to `MELP` as a whole token, NOT to `PISA-MELP`.
 * - Email addresses are never rewritten. No `sec_template` or `result_status`
 *   value contains an SPRM address, and the replacements below are scoped to
 *   exact phrases rather than a blanket `REPLACE(col, 'SPRM', 'MELP')`, so an
 *   address added later could not be caught by accident.
 *
 * ## Rows touched (measured read-only against the shared on-premise database
 * `alliancereportingdb` on 2026-10-05, not inferred from the migration history)
 *
 * | Table          | Row                           | Column             | Before                               |
 * | -------------- | ----------------------------- | ------------------ | ------------------------------------ |
 * | `sec_template` | #14 `ask-help-content`          | `template`         | `<p>Dear SPRM team,</p>`             |
 * | `sec_template` | #15 `oicr-notification-created` | `template`         | `<p>Dear SPRM team,</p>`             |
 * | `sec_template` | #16 `oicr-approved-result`      | `template`         | `...from the PISA-SPRM team</p>`     |
 * | `result_status`| 9 OICR Requested                | `description`      | `The SPRM team will review it ... by the PISA-SPRM team` |
 * | `result_status`| 10 OICR Accepted                | `description`      | `...backstopping from the PISA-SPRM team.` |
 * | `result_status`| 10 OICR Accepted                | `action_description`| `...backstopping from the PISA-SPRM team.` |
 * | `result_status`| 11 OICR Postponed               | `description`      | `The SPRM team has decided to postpone it...` |
 *
 * ## Why the dash is handled with a regex and a hex literal
 *
 * The two `result_status.description` values use an EN DASH (U+2013,
 * `PISA-SPRM` rendered as `PISA{U+2013}SPRM`), while `action_description` and
 * every `sec_template` body use a plain ASCII hyphen. A literal `REPLACE`
 * written with one dash silently matches nothing on the rows that use the
 * other -- a no-op that reports success. `up()` therefore matches the
 * separator with `PISA[^A-Za-z]SPRM`, and `down()` rebuilds the EN DASH as
 * `_utf8mb4 0xE28093` so the rollback cannot depend on this file's own
 * encoding surviving an editor round-trip.
 *
 * `REPLACE()` is case-sensitive in MySQL, which is what keeps `'The MELP
 * team'` and `'the MELP team'` from colliding in `down()` on status 9 (it
 * contains both).
 *
 * Idempotent: re-running `up()` is a no-op, since the search phrases no
 * longer exist once replaced.
 *
 * Verified before authoring: `up()` leaves zero SPRM residue and
 * `up()` -> `down()` restores all six values byte-identically, simulated
 * read-only inside a `START TRANSACTION READ ONLY` against the live
 * database. MySQL 8.0.45.
 */
export class RenameSprmToMelpInTemplatesAndStatuses1791213000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- sec_template: email bodies -------------------------------------
    await queryRunner.query(`
      UPDATE sec_template
      SET template = REPLACE(template, 'Dear SPRM team,', 'Dear MELP team,')
      WHERE name IN ('ask-help-content', 'oicr-notification-created')
    `);

    await queryRunner.query(`
      UPDATE sec_template
      SET template = REPLACE(template, 'PISA-SPRM team', 'MELP team')
      WHERE name = 'oicr-approved-result'
    `);

    // --- result_status: copy rendered in the OICR submission UI ---------
    await queryRunner.query(`
      UPDATE result_status
      SET description = REPLACE(
            REGEXP_REPLACE(description, 'PISA[^A-Za-z]SPRM', 'MELP'),
            'The SPRM team', 'The MELP team')
      WHERE result_status_id IN (9, 10, 11)
    `);

    await queryRunner.query(`
      UPDATE result_status
      SET action_description =
            REGEXP_REPLACE(action_description, 'PISA[^A-Za-z]SPRM', 'MELP')
      WHERE result_status_id = 10
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- result_status --------------------------------------------------
    // 'The MELP team' (capital T) first: status 9 carries both forms, and
    // only a case-sensitive REPLACE keeps them apart.
    await queryRunner.query(`
      UPDATE result_status
      SET description = REPLACE(
            REPLACE(description, 'The MELP team', 'The SPRM team'),
            'the MELP team',
            CONCAT('the PISA', _utf8mb4 0xE28093, 'SPRM team'))
      WHERE result_status_id IN (9, 10, 11)
    `);

    await queryRunner.query(`
      UPDATE result_status
      SET action_description =
            REPLACE(action_description, 'the MELP team', 'the PISA-SPRM team')
      WHERE result_status_id = 10
    `);

    // --- sec_template ---------------------------------------------------
    await queryRunner.query(`
      UPDATE sec_template
      SET template = REPLACE(template, 'the MELP team', 'the PISA-SPRM team')
      WHERE name = 'oicr-approved-result'
    `);

    await queryRunner.query(`
      UPDATE sec_template
      SET template = REPLACE(template, 'Dear MELP team,', 'Dear SPRM team,')
      WHERE name IN ('ask-help-content', 'oicr-notification-created')
    `);
  }
}
