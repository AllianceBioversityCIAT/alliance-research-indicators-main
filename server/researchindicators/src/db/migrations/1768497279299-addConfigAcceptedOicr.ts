import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigAcceptedOicr1768497279299 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-approved-result", "custom_config_email": "oicrApprovalConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "function", "config": {"function_name": "reviewOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        9,
        10,
        31,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-approved-result", "custom_config_email": "oicrApprovalConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "function", "config": {"function_name": "reviewOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        11,
        10,
        40,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "oicr-approved-result", "custom_config_email": "oicrApprovalConfigEmail", "custom_data_resolver": "findCustomDataForOicr"}, "enabled": true}, {"type": "function", "config": {"function_name": "reviewOicr"}, "enabled": true}, {"type": "validation", "config": {"function_name": "oicrRoleChangeStatusValidation"}, "enabled": true}]}',
        15,
        10,
        42,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 9, 10, 31],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 11, 10, 40],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 15, 10, 42],
    );
  }
}
