import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEvidences1728055284536 implements MigrationInterface {
  name = 'RefactorEvidences1728055284536';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` DROP COLUMN \`evidence_role_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` ADD \`evidence_role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` ADD CONSTRAINT \`FK_4b02d00f23e6c9e2ffc393896ae\` FOREIGN KEY (\`evidence_role_id\`) REFERENCES \`evidence_roles\`(\`evidence_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO evidence_roles (evidence_role_id, name) VALUES (1, 'Principal Evidence')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` DROP FOREIGN KEY \`FK_4b02d00f23e6c9e2ffc393896ae\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` DROP COLUMN \`evidence_role_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` ADD \`evidence_role_id\` text NOT NULL`,
    );
    await queryRunner.query(
      `DELETE FROM evidence_roles WHERE evidence_role_id = 1`,
    );
  }
}
