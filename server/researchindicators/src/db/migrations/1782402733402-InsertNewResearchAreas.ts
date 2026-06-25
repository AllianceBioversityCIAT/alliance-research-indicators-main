import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertNewResearchAreas1782402733402 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`lever_sdg_targets\` DROP FOREIGN KEY \`FK_e06b57688faa64aa79b1afd2e97\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`result_levers\` DROP FOREIGN KEY \`FK_e1fc97f82440f07c53e8b4876e8\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`clarisa_levers\` MODIFY \`id\` bigint NOT NULL AUTO_INCREMENT;`,
        );
        await queryRunner.query(
            `ALTER TABLE \`lever_sdg_targets\` ADD CONSTRAINT \`FK_e06b57688faa64aa79b1afd2e97\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE \`result_levers\` ADD CONSTRAINT \`FK_e1fc97f82440f07c53e8b4876e8\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `ALTER TABLE \`clarisa_levers\` CHANGE \`short_name\` \`short_name\` text NULL`,
        );
        await queryRunner.query(
            `INSERT INTO \`clarisa_levers\` (\`id\`,\`full_name\`, \`other_names\`, \`portfolio_id\`) 
            VALUES (10, 'Food Environments and Consumer Behavior', 'Food Environments and Consumer Behavior', 2),
                    (11, 'Multifunctional Landscapes', 'Multifunctional Landscapes', 2),
                    (12, 'Climate Action', 'Climate Action', 2),
                    (13, 'Biodiversity for Food and Agriculture', 'Biodiversity for Food and Agriculture', 2),
                    (14, 'Digital Inclusion', 'Digital Inclusion', 2),
                    (15, 'Crops for Nutrition and Health', 'Crops for Nutrition and Health', 2),
                    (16, 'Gender and Inclusion', 'Gender and Inclusion', 2),
                    (17, 'Performance, Innovation and Strategic Analysis for Impact', 'Performance, Innovation and Strategic Analysis for Impact', 2)`,
        );

        await queryRunner.query(
            `ALTER TABLE \`clarisa_levers\` AUTO_INCREMENT = 18;`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM \`clarisa_levers\` WHERE \`id\` IN (10, 11, 12, 13, 14, 15, 16, 17)`,
        );
    }
}
