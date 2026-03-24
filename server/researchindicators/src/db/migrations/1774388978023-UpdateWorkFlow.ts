import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class UpdateWorkFlow1774388978023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      ` UPDATE result_status_workflow SET config = ? WHERE id = ?`,
      [
        JSON.stringify({
          actions: [
            {
              type: 'email',
              config: {
                template: 'submitted-result',
                custom_config_email: 'submittedConfigEmail',
                custom_data_resolver: 'findCustomDataSubmitted',
              },
              enabled: true,
            },
            {
              type: 'email',
              config: {
                template: 'innovation-level-seven',
                custom_config_email: 'innovationLevelSevenConfigEmail',
                condition_to_execute:
                  'validateInnovationReadinessLevelSevenOrHigher',
                custom_data_resolver:
                  'findCustomDataForInnovationReadinessLevelSeven',
              },
              enabled: true,
            },
            {
              type: 'validation',
              config: { function_name: 'completenessValidation' },
              enabled: false,
            },
          ],
        }),
        7,
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
    <title>Innovation Readiness Level Seven</title>
  </head>
  <body>
    <p>Dear Laura,</p>
    <p>
      An innovation has been submitted in STAR with a readiness level of
      {{innovation_readiness_level}}.
    </p>
    <p>Details of the innovation:</p>
    <ul>
      <li><b>Innovation ID:</b> {{result_code}}</li>
      <li><b>Innovation Title:</b> {{title}}</li>
      <li><b>Associated Project:</b> {{contract.code}} - {{contract.title}}</li>
      <li><b>Principal Investigator:</b> {{principal_investigator.name}}</li>
      <li><b>Submission Date:</b> {{history.created_at}}</li>
    </ul>
    <p>
      <b>In what context is this tool useful?</b><br />
      "{{innovation_dev.tool_useful_context}}"
    </p>
    <p>
      You can access the full submission directly in STAR, including the
      Knowledge Sharing section, through the following link:
    </p>
    <p><a href="{{url}}">{{url}}</a></p>
    <p>Kind Regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i
        >Please do not reply to this email, as this mailbox is not monitored.</i
      >
    </p>
  </body>
</html>
`,
        TemplateEnum.INNOVATION_LEVEL_SEVEN,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      ` UPDATE result_status_workflow SET config = ? WHERE id = ?`,
      [
        JSON.stringify({
          actions: [
            {
              type: 'email',
              config: {
                template: 'submitted-result',
                custom_config_email: 'submittedConfigEmail',
                custom_data_resolver: 'findCustomDataSubmitted',
              },
              enabled: true,
            },
            {
              type: 'email',
              config: {
                template: 'innovation-level-seven',
                custom_config_email: 'innovationLevelSevenConfigEmail',
                condition_to_execute:
                  'validateInnovationReadinessLevelSevenOrHigher',
                custom_data_resolver: 'findCustomDataSubmitted',
              },
              enabled: true,
            },
            {
              type: 'validation',
              config: { function_name: 'completenessValidation' },
              enabled: false,
            },
            {
              type: 'function',
              config: { function_name: 'findInnovationReadinessLevel' },
              enabled: true,
            },
          ],
        }),
        7,
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
    <title>Innovation Readiness Level Seven</title>
  </head>
  <body>
    <p>Dear Laura,</p>
    <p>
      An innovation has been submitted in STAR with a readiness level of
      {{innovation_readiness_level}}.
    </p>
    <p>Details of the innovation:</p>
    <ul>
      <li>Innovation ID: {{result_code}}</li>
      <li>Innovation Title: {{title}}</li>
      <li>Associated Project: {{contract.code}} - {{contract.title}}</li>
      <li>Principal Investigator: {{principal_investigator.name}}</li>
      <li>Submission Date: {{history.created_at}}</li>
    </ul>
    <p>
      You can access the full submission directly in STAR, including the
      Knowledge Sharing section, through the following link:
    </p>
    <p><a href="{{url}}">{{url}}</a></p>
    <p>Kind Regards,<br /><b>{{platform_code}} System Notification</b></p>
    <p>
      <i
        >Please do not reply to this email, as this mailbox is not monitored.</i
            >
    </p>
  </body>
</html>
`,
        TemplateEnum.INNOVATION_LEVEL_SEVEN,
      ],
    );
  }
}
