import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedDeleteAtColumn1732023678699 implements MigrationInterface {
  name = 'AddedDeleteAtColumn1732023678699';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicator_types\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_geo_scope\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`contract_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contract_countries\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_agresso_contract\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_regions\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_types\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`institution_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries_sub_nationals\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`country_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_languages\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`language_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_languages\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_keywords\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`policy_types\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`policy_stage\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_result_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_formats\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_types\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`degrees\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_lengths\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gender\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`delivery_modalities\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_purposes\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_roles\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` ADD \`deleted_at\` timestamp NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_purposes\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`delivery_modalities\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`gender\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_lengths\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`degrees\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_types\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`session_formats\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`alliance_user_staff\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_result_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`policy_stage\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`policy_types\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_keywords\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_languages\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`language_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_languages\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`country_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries_sub_nationals\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`institution_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_regions\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`lever_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_agresso_contract\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contract_countries\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`contract_roles\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_geo_scope\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_types\` DROP COLUMN \`deleted_at\``,
    );
  }
}
