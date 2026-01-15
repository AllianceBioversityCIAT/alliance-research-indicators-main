import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class AddConfigRequestOicr1768508920651 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OICR Request</title>
  </head>
  <body>
    <p>Dear SPRM team,</p>
    <p>
      A new preliminary OICR submission has been created in STAR. Please find
      the details below:
    </p>
    <ul>
      <li><b>OICR ID:</b> {{oicr_internal_code}}</li>
      <li><b>OICR Title:</b> {{title}}</li>
      <li><b>Associated Project:</b> {{contract.code}} - {{contract.title}}</li>
      <li><b>Principal Investigator:</b> {{principal_investigator.name}}</li>
      <li><b>Request Date:</b> {{created_at}}</li>
    </ul>
    <p>
      You can access the submission directly through STAR:
      <a href="{{url}}">{{url}}</a> <br />Additionally, you may download the
      submission as a Word document using the following link:
      <a href="{{download_url}}">{{download_url}}</a>
    </p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
  </body>
</html>
`,
        TemplateEnum.OICR_NOTIFICATION_CREATED,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      [null, TemplateEnum.OICR_NOTIFICATION_CREATED],
    );
  }
}
