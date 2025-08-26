import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class CreatedOicrTemplate1756143877136 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`insert into \`sec_template\` (\`name\`, \`template\` ) values ('${TemplateEnum.OICR_NOTIFICATION_CREATED}','<!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8" />
                                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                                <title>OICR</title>
                            </head>
                            <body>
                                <p>Dear SPRM team,</p>
                                <p>A new OICR has been submitted and is ready for review.</p>
                                <p>
                                <b>Submission Number:</b>
                                {{result_code}} <br />
                                <b>Title:</b> {{result_title}} <br />
                                <b>Project Code:</b> {{contract_code}} – {{contract_description}} <br />
                                <b>Principal Investigator:</b> {{principal_investigator}} <br />
                                <b>Primary Lever:</b> {{primary_lever}} <br />
                                <b>Main Contact Person:</b> {{main_contact_person}}
                                </p>

                                <p><b>Description:</b> {{oicr_description}}</p>

                                <p><b>Access the OICR:</b> {{oicr_link}}</p>

                                <p>
                                Please review and coordinate with PISA for support in the development of
                                this OICR.
                                </p>

                                <p>STAR</p>
                            </body>
                            </html>')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`sec_template\` WHERE name='${TemplateEnum.OICR_NOTIFICATION_CREATED}'`,
    );
  }
}
