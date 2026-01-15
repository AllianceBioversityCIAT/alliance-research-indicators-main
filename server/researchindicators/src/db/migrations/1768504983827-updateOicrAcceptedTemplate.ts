import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class UpdateOicrAcceptedTemplate1768504983827
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
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
            <li><b>OICR ID:</b> {{oicr_internal_code}}</li>
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE sec_template SET template = ? WHERE name = ?`,
      [null, TemplateEnum.OICR_APPROVED],
    );
  }
}
