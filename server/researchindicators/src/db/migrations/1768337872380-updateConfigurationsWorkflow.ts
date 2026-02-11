import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateConfigurationsWorkflow1768337872380
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}]}',
        2,
        6,
        4,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}]}',
        2,
        6,
        10,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}]}',
        2,
        6,
        16,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}]}',
        2,
        6,
        22,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "function", "config": {"function_name": "createSnapshot"}, "enabled": true}]}',
        2,
        6,
        28,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}',
        2,
        6,
        4,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}',
        2,
        6,
        10,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}',
        2,
        6,
        16,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}',
        2,
        6,
        22,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}',
        2,
        6,
        28,
      ],
    );
  }
}
