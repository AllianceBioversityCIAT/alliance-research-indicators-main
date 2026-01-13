import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateConfigWorkflow1768329933286 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": false}]}',
        4,
        2,
        1,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": false}]}',
        2,
        4,
        2,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "revise-result", "custom_config_email": "revisionConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        5,
        3,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}]}',
        2,
        6,
        4,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "rejected-result", "custom_config_email": "noApprovedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        7,
        5,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": true}]}',
        5,
        2,
        6,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": false}]}',
        4,
        2,
        7,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": false}]}',
        2,
        4,
        8,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "revise-result", "custom_config_email": "revisionConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        5,
        9,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}]}',
        2,
        6,
        10,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "rejected-result", "custom_config_email": "noApprovedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        7,
        11,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": true}]}',
        5,
        2,
        12,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": false}]}',
        4,
        2,
        13,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": false}]}',
        2,
        4,
        14,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "revise-result", "custom_config_email": "revisionConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        5,
        15,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}]}',
        2,
        6,
        16,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "rejected-result", "custom_config_email": "noApprovedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        7,
        17,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": true}]}',
        5,
        2,
        18,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": false}]}',
        4,
        2,
        19,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": false}]}',
        2,
        4,
        20,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "revise-result", "custom_config_email": "revisionConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        5,
        21,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}]}',
        2,
        6,
        22,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "rejected-result", "custom_config_email": "noApprovedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        7,
        23,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": true}]}',
        5,
        2,
        24,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": false}]}',
        4,
        2,
        25,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": false}]}',
        2,
        4,
        26,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "revise-result", "custom_config_email": "revisionConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        5,
        27,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "approval-result", "custom_config_email": "approvedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}]}',
        2,
        6,
        28,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "rejected-result", "custom_config_email": "noApprovedConfigEmail", "custom_data_resolver": "findCustomDataForRevision"}, "enabled": true}, {"type": "validation", "config": {"function_name": "commentValidation"}, "enabled": true}]}',
        2,
        7,
        29,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [
        '{"actions": [{"type": "email", "config": {"template": "submitted-result", "custom_config_email": "submittedConfigEmail", "custom_data_resolver": "findCustomDataSubmitted"}, "enabled": true}, {"type": "validation", "config": {"function_name": "completenessValidation"}, "enabled": true}]}',
        5,
        2,
        30,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 2, 1],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 4, 2],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 5, 3],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 6, 4],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 7, 5],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 5, 2, 6],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 2, 7],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 4, 8],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 5, 9],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 6, 10],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 7, 11],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 5, 2, 12],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 2, 13],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 4, 14],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 5, 15],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 6, 16],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 7, 17],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 5, 2, 18],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 2, 19],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 4, 20],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 5, 21],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 6, 22],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 7, 23],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 5, 2, 24],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 4, 2, 25],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 4, 26],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 5, 27],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 6, 28],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 2, 7, 29],
    );
    await queryRunner.query(
      `UPDATE result_status_workflow SET config = ?, from_status_id = ?, to_status_id = ? WHERE id = ?`,
      [null, 5, 2, 30],
    );
  }
}
