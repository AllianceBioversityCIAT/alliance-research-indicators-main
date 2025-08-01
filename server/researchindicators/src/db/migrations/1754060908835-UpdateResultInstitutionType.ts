import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateResultInstitutionType1754060908835 implements MigrationInterface {
    name = 'UpdateResultInstitutionType1754060908835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_145b6af1c77c6efcd902ef9535d\``);
        await queryRunner.query(`ALTER TABLE \`result_institution_types\` CHANGE \`institution_type_id\` \`institution_type_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_145b6af1c77c6efcd902ef9535d\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_145b6af1c77c6efcd902ef9535d\``);
        await queryRunner.query(`ALTER TABLE \`result_institution_types\` CHANGE \`institution_type_id\` \`institution_type_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_145b6af1c77c6efcd902ef9535d\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
