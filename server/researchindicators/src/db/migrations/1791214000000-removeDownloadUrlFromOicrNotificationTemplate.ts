import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the "download as a Word document" sentence and its link from the
 * `oicr-notification-created` email body (`sec_template` row #15).
 *
 * The 2026 OICR does not have that document yet, so `{{download_url}}`
 * resolved to a link the recipient cannot use. The sentence is dropped
 * rather than conditionalised: the template engine renders a flat string
 * substitution and has no conditional block.
 *
 * ## Exact fragment removed (157 characters, measured read-only against the
 * shared on-premise database `alliancereportingdb` on 2026-10-05)
 *
 * ```
 *  <br />Additionally, you may download the\n
 *       submission as a Word document using the following link:\n
 *       <a href="{{download_url}}">{{download_url}}</a>
 * ```
 *
 * It sits immediately after the STAR link, inside the same `<p>`:
 *
 * ```
 *     <p>
 *       You can access the submission directly through STAR:
 *       <a href="{{url}}">{{url}}</a> <br />Additionally, you may download the
 *       submission as a Word document using the following link:
 *       <a href="{{download_url}}">{{download_url}}</a>
 *     </p>
 * ```
 *
 * leaving the paragraph ending at `<a href="{{url}}">{{url}}</a>`. The row
 * goes from 1107 to 950 characters and retains no `download_url` reference.
 * Row #15 is the ONLY `sec_template` row mentioning `download_url`.
 *
 * ## Why CONCAT / CHAR(10) instead of a multi-line string literal
 *
 * The fragment spans three lines and its two continuation lines are indented
 * by exactly six spaces. Written as a literal inside a TS template literal,
 * that leading whitespace becomes a function of this file's own indentation,
 * so a reformat (Prettier, an editor, a careless re-indent) would silently
 * change the search string — and `REPLACE` with a string that no longer
 * matches is a no-op that reports success. Building it from `CONCAT(...)`
 * plus explicit `CHAR(10)` keeps every space countable and independent of how
 * this file is laid out. The stored value uses LF only; there is no CRLF.
 *
 * Idempotent: `REPLACE` with an absent search string is a no-op, so re-running
 * `up()` changes nothing. `down()` is guarded by `NOT LIKE '%download_url%'`
 * so it cannot append the fragment twice.
 *
 * `{{download_url}}` is still produced by
 * `result-status-workflow.repository.ts` (`generalData.customData.download_url`)
 * and is deliberately left in place — it simply goes unrendered. Removing the
 * producer is a separate change with its own spec coverage.
 *
 * Verified before authoring: `up()` leaves no `download_url` in the row and
 * `up()` -> `down()` restores the value byte-identically, simulated read-only
 * against the live database. MySQL 8.0.45.
 */
export class RemoveDownloadUrlFromOicrNotificationTemplate1791214000000
  implements MigrationInterface
{
  /**
   * The removed fragment, assembled so that no part of it depends on this
   * file's indentation. `CHAR(10)` is LF.
   */
  private static readonly FRAGMENT_SQL = `CONCAT(
            ' <br />Additionally, you may download the', CHAR(10),
            '      submission as a Word document using the following link:', CHAR(10),
            '      <a href="{{download_url}}">{{download_url}}</a>'
          )`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE sec_template
      SET template = REPLACE(
            template,
            ${RemoveDownloadUrlFromOicrNotificationTemplate1791214000000.FRAGMENT_SQL},
            '')
      WHERE name = 'oicr-notification-created'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-attach the fragment directly after the STAR link, which is the only
    // `<a href="{{url}}">{{url}}</a>` in the body. `{{url}}` is not a
    // substring of `{{download_url}}`, so the anchor is unambiguous.
    await queryRunner.query(`
      UPDATE sec_template
      SET template = REPLACE(
            template,
            '<a href="{{url}}">{{url}}</a>',
            CONCAT(
              '<a href="{{url}}">{{url}}</a>',
              ${RemoveDownloadUrlFromOicrNotificationTemplate1791214000000.FRAGMENT_SQL}
            ))
      WHERE name = 'oicr-notification-created'
        AND template NOT LIKE '%download_url%'
    `);
  }
}
