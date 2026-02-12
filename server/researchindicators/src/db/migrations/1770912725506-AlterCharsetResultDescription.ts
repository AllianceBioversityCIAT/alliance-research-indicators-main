import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterCharsetResultDescription1770912725506 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE results 
                                MODIFY description TEXT 
                                CHARACTER SET utf8mb4 
                                COLLATE utf8mb4_unicode_ci;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE results 
                                MODIFY description TEXT 
                                CHARACTER SET utf8mb4 
                                COLLATE utf8mb4_unicode_ci;`);
    }

}
