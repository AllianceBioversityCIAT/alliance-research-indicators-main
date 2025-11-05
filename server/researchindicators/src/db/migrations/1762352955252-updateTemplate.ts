import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class UpdateTemplate1762352955252 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE sec_template SET template = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <p>Dear {{pi_name}},</p>

    <p>
      {{sub_last_name}}, {{sub_first_name}} has submitted a new result in STAR
      for the project {{project_name}}. To complete the submission process, your
      review and approval are required. You can access the result and take action
      by clicking the link below:
    </p>
    <p><a href="{{url}}">{{indicator}} - {{result_id}} - {{title}}</a></p>
    <p>
      If you have any questions related to content, please contact 
      <a href="mailto:{{content_support_email}}">{{content_support_email}}</a>.<br />
      For technical assistance, feel free to reach out to 
      <a href="mailto:{{support_email}}">{{support_email}}</a>.
    </p>
    <p>Best regards,</p>
	<p>{{system_name}}</p>
    <p><i>This is an automated email. Please do not reply.</i></p>
  </body>
</html>' WHERE name='${TemplateEnum.SUBMITTED_RESULT}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE sec_template SET template = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <p>Dear {{pi_name}},</p>

    <p>
      {{sub_last_name}}, {{sub_first_name}} has submitted a new result in ROAR
      for the project {{project_name}}. To complete the submission process, your
      review and approval are required. You can access the result and take action
      by clicking the link below:
    </p>
    <p><a href="{{url}}">{{indicator}} - {{result_id}} - {{title}}</a></p>
    <p>
      If you have any questions related to content, please contact 
      <a href="mailto:{{content_support_email}}">{{content_support_email}}</a>.<br />
      For technical assistance, feel free to reach out to 
      <a href="mailto:{{support_email}}">{{support_email}}</a>.
    </p>
    <p>Best regards,</p>
	<p>{{system_name}}</p>
    <p><i>This is an automated email. Please do not reply.</i></p>
  </body>
</html>' WHERE name='${TemplateEnum.SUBMITTED_RESULT}'`);
  }
}
