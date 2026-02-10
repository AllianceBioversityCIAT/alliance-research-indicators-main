import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotAcceptedConfig1768578051719
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-rejected-result", "custom_config_email": "oicrRejectedConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        9,
        15,
        33,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-rejected-result", "custom_config_email": "oicrRejectedConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        11,
        15,
        39,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-rejected-result", "custom_config_email": "oicrRejectedConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        10,
        15,
        44,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 9, 15, 33],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 11, 15, 39],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 10, 15, 44],
    );
  }
}
