import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationOldHistory1772141086603 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`update submission_history 
                                set custom_date = created_at;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`update submission_history 
                                set custom_date = null;`);
    }

}
