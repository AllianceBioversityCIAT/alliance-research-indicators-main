import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class UpdateTemplates1768330211990 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Revision</title>
  </head>
  <body>
    <p>Dear {{submitter.name}},</p>
    <p>
      The result
      <a href="{{url}}">{{indicator_name}} {{result_code}} - {{title}}</a> has
      been reviewed by {{action_executor.name}}, and a revision has been
      <b>requested</b>.
    </p>
    <p>
      <b>Feedback provided: </b><br />
      <i>"{{description}}"</i>
    </p>
    <p>
      The result is now editable again. Please make the necessary adjustments
      based on the feedback received and submit it again for review.
    </p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
  </body>
</html>
`,
        TemplateEnum.REVISE_RESULT,
      ],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>no accepted</title>
  </head>
  <body>
    <p>Dear {{submitter.name}},</p>
    <p>
      The result
      <a href="{{url}}">{{indicator_name}} {{result_code}} - {{title}}</a> has
      been reviewed by <b>{{action_executor.name}}</b>, and was
      <b>not approved</b>.
    </p>
    <p>
      <b>Reason provided: </b><br />
      <i>"{{description}}"</i>
    </p>
    <p>You may access the result here: <a href="{{url}}">{{url}}</a></p>
    <p>
      If you have any questions regarding this decision, please contact
      {{action_executor.name}}.
    </p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
  </body>
</html>
`,
        TemplateEnum.REJECTED_RESULT,
      ],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      [
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>accepted</title>
  </head>
  <body>
    <p>Dear {{submitter.name}},</p>
    <p>
      The result
      <a href="{{url}}">{{indicator_name}} {{result_code}} - {{title}}</a> has
      been <b>approved</b> by <b>{{action_executor.name}}</b>.
    </p>
    <p>You may access the result here: <a href="{{url}}">{{url}}</a></p>
    <p>
      Following this approval, the result will be included in the Alliance
      Results Dashboard in due course.
    </p>
    <p>Best regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i>This is an automated email. Please do not reply.</i>
    </p>
  </body>
</html>
`,
        TemplateEnum.APPROVAL_RESULT,
      ],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
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
      {{result_code}} - {{title}}. To complete the submission process, your
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
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      ['', TemplateEnum.REVISE_RESULT],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      ['', TemplateEnum.REJECTED_RESULT],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      ['', TemplateEnum.APPROVAL_RESULT],
    );
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      ['', TemplateEnum.SUBMITTED_RESULT],
    );
  }
}
