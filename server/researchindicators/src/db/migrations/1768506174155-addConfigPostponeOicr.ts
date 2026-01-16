import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class AddConfigPostponeOicr1768506174155 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-postpone-result", "custom_config_email": "oicrPostponeConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        9,
        11,
        32,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-postpone-result", "custom_config_email": "oicrPostponeConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        15,
        11,
        41,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-postpone-result", "custom_config_email": "oicrPostponeConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        10,
        11,
        43,
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
    <title>OICR Postpone</title>
  </head>
  <body>
    <p>Dear {{submitter.name}},</p>
    <p>
      Your OICR submission has been reviewed and was marked as <b>postponed</b>.
    </p>
    <p>Please find the details below:</p>
    <ul>
      <li><b>OICR ID:</b> {{oicr_internal_code}}</li>
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 9, 11, 32],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 15, 11, 41],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 10, 11, 43],
    );
  }
}
