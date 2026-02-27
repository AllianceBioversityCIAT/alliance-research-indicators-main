import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class UpdateTemplates1769536751195 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OICR Accepted</title>
</head>
<body>
    <p>Dear {{submitter.name}},</p>
    <p>Your OICR submission has been <b>accepted</b>. The development of the OICR will continue with backstopping from the PISA-SPRM team</p>
    <p>Please find the details below:
        <ul>
            <li><b>OICR ID:</b> {{result_code}}</li>
            <li><b>OICR Title:</b> {{title}}</li>
            <li><b>Associated Project:</b> {{contract.code}} - {{contract.title}}</li>
            <li><b>Sharepoint Folder Link:</b> {{sharepoint_url}}</li>
            <li><b>Assigned MEL Regional Expert:</b> {{regional_expert.name}}</li>
            <li><b>Principal Investigator:</b> {{principal_investigator.name}}</li>
            <li><b>Request Date:</b> {{created_at}}</li>
        </ul>
    </p>
    <p>Please use the assigned folder link for documentation and next steps.</p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
</body>
</html>`,
        TemplateEnum.OICR_APPROVED,
      ],
    );

    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OICR No Accepted</title>
  </head>
  <body>
    <p>Dear {{submitter.name}},</p>
    <p>Your OICR submission has been reviewed and was <b>not accepted</b>.</p>
    <p>Please find the details below:</p>
    <ul>
      <li><b>OICR ID:</b> {{result_code}}</li>
      <li><b>OICR Title:</b> {{title}}</li>
      <li><b>Associated Project:</b> {{contract.code}} - {{contract.title}}</li>
      <li><b>Principal Investigator:</b> {{principal_investigator.name}}</li>
      <li><b>Request Date:</b> {{created_at}}</li>
    </ul>
    <p>
      Justification provided: <br />
      <i>"{{description}}"</i>
    </p>
    <p>
      You can access your submission directly through STAR:
      <a href="{{url}}">{{url}}</a>
    </p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
  </body>
</html>`,
        TemplateEnum.OICR_REJECTED,
      ],
    );

    await queryRunner.query(
      `UPDATE sec_template SET template = ?
    WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OICR Postpone</title>
  </head>
  <body>
    <p>Dear {{submitter.name}},</p>
    <p>
      Your OICR submission has been reviewed and was marked as <b>postponed</b>.
    </p>
    <p>Please find the details below:</p>
    <ul>
      <li><b>OICR ID:</b> {{result_code}}</li>
      <li><b>OICR Title:</b> {{title}}</li>
      <li><b>Associated Project:</b> {{contract.code}} - {{contract.title}}</li>
      <li><b>Principal Investigator:</b> {{principal_investigator.name}}</li>
      <li><b>Request Date:</b> {{created_at}}</li>
    </ul>
    <p>
      Justification provided: <br />
      <i>"{{description}}"</i>
    </p>
    <p>
      You can access your submission directly through STAR:
      <a href="{{url}}">{{url}}</a>
    </p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
  </body>
</html>`,
        TemplateEnum.OICR_POSTPONE,
      ],
    );

    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Submitted Result</title>
  </head>
  <body>
    <p>Dear {{principal_investigator.name}},</p>
    <p>
      {{submitter.name}} has submitted a new result in STAR for the project
      {{contract.code}} - {{contract.title}}. To complete the submission process, your
      review and approval are required.
    </p>
    <p>You can access the result and take action by clicking the link below:</p>
    <p><a href="{{url}}">{{indicator_name}} {{result_code}} - {{title}}</a></p>
    <p>
      If you have any questions or need assistance, please reach out through the
      available support channels: <br />{{support_email}}
    </p>
    <p>Best regards, <br /><b>{{platform_code}} System Notification</b></p>
    <p><i>This is an automated email. Please do not reply.</i></p>
  </body>
</html>
`,
        TemplateEnum.SUBMITTED_RESULT,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [``, TemplateEnum.OICR_APPROVED],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [``, TemplateEnum.OICR_REJECTED],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [``, TemplateEnum.OICR_POSTPONE],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ?
            WHERE name = ?`,
      [``, TemplateEnum.SUBMITTED_RESULT],
    );
  }
}
