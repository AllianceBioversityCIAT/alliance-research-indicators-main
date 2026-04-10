import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLinkTip1775850475192 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE results SET public_link = external_link WHERE public_link IS NULL AND platform_code = 'TIP'`,
        );
        await queryRunner.query(
            `UPDATE results SET external_link = NULL WHERE platform_code = 'TIP'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE results SET external_link = public_link WHERE platform_code = 'TIP'`,
        );
        await queryRunner.query(
            `UPDATE results SET public_link = NULL WHERE platform_code = 'TIP'`,
        );
    }
}
