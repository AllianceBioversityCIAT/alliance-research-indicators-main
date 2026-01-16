import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateWorkFlowDirectlyApproved1768594523277
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "directly-approved", "custom_config_email": "directlyApprovedConfigEmail", "custom_data_resolver": "getDataForSubmissionResult"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}, {"type": "validation", "config": {"function_name": "isPiValidation"}, "enabled": true}]}',
        4,
        6,
        45,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "directly-approved", "custom_config_email": "directlyApprovedConfigEmail", "custom_data_resolver": "getDataForSubmissionResult"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}, {"type": "validation", "config": {"function_name": "isPiValidation"}, "enabled": true}]}',
        4,
        6,
        46,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "directly-approved", "custom_config_email": "directlyApprovedConfigEmail", "custom_data_resolver": "getDataForSubmissionResult"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}, {"type": "validation", "config": {"function_name": "isPiValidation"}, "enabled": true}]}',
        4,
        6,
        47,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "directly-approved", "custom_config_email": "directlyApprovedConfigEmail", "custom_data_resolver": "getDataForSubmissionResult"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}, {"type": "validation", "config": {"function_name": "isPiValidation"}, "enabled": true}]}',
        4,
        6,
        48,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "directly-approved", "custom_config_email": "directlyApprovedConfigEmail", "custom_data_resolver": "getDataForSubmissionResult"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}, {"type": "validation", "config": {"function_name": "isPiValidation"}, "enabled": true}]}',
        4,
        6,
        49,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 6, 45],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 6, 46],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 6, 47],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 6, 48],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 6, 49],
    );
  }
}
