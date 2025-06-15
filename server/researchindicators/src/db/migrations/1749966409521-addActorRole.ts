import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActorRole1749966409521 implements MigrationInterface {
  name = 'AddActorRole1749966409521';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_561ddcd56c23b7d0df6ad280fef\` FOREIGN KEY (\`actor_role_id\`) REFERENCES \`actor_roles\`(\`actor_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_561ddcd56c23b7d0df6ad280fef\``,
    );
  }
}
