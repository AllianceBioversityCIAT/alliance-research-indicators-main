import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDbEnv1778078328257 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO app_config (\`key\`) VALUES ('ARI_SUPPORT_EMAIL');`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM app_config WHERE \`key\` = 'ARI_SUPPORT_EMAIL';`,
        );
    }
}
