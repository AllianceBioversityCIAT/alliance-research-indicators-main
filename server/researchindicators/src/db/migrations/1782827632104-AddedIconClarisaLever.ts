import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedIconClarisaLever1782827632104 implements MigrationInterface {
    name = 'AddedIconClarisaLever1782827632104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_levers\` ADD \`icon\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_levers\` DROP COLUMN \`icon\``);
    }

}
