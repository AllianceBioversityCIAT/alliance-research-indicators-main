import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

/**
 * Single source of truth for the seeded HTML (KZ-001 guard).
 *
 * The on-disk mirror at
 * `../../domain/shared/auxiliar/template/template/capdev-bulk-summary.html`
 * is committed for human review/diffability only. It is never read by the
 * running application. A sibling spec
 * (`capdev-bulk-summary.template.spec.ts`) imports this exact constant and
 * asserts the disk file is byte-identical to it, so the two can never
 * silently drift — if someone edits one side without the other, that spec
 * fails.
 */
export const CAPDEV_BULK_SUMMARY_TEMPLATE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CapDev Bulk Upload — Training Results Recorded</title>
  </head>
  <body>
    <p>Dear {{projectLeadName}},</p>
    <p>
      The team is most pleased to inform you that your training results have
      been duly entered and confirmed within the institutional reporting
      system.
    </p>
    <p>
      The records encompass {{trainingsCount}} trainings conducted{{#if countries}} across {{countries}}{{/if}}{{#if startDate}} during the period from {{startDate}} to {{endDate}}{{/if}}{{#if participantsCount}}, in which {{participantsCount}} participants took part{{#if percentageWomen}} — {{percentageWomen}}% of whom were women, a most noteworthy figure{{/if}}{{/if}}.
    </p>
    <p>
      You may review the uploaded Capacity Development activities at the
      following link:<br />
      <a href="{{{starLink}}}">{{{starLink}}}</a>
    </p>
    <p>
      Copied herein are the delegates who form part of the joint activities.
      Should any questions or requests arise, contact direct them to
      {{tokenOwnerName}} ({{tokenOwnerEmail}}), who shall be happy to assist.
    </p>
    <p>Best regards,<br />The Alliance of Bioversity and CIAT</p>
  </body>
</html>
`;

export class InsertCapdevBulkSummaryTemplate1786045516418
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO sec_template (name, template, description) VALUES (?,?,?)`,
      [
        TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY,
        CAPDEV_BULK_SUMMARY_TEMPLATE_HTML,
        'CapDev bulk-upload completion email sent to the project lead after a batch of Capacity Development results is confirmed. See docs/specs/results/capdev-bulk-upload-notification.',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM sec_template WHERE name = ?`, [
      TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY,
    ]);
  }
}
