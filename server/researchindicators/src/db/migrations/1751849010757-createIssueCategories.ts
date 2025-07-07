import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIssueCategories1751849010757 implements MigrationInterface {
    name = 'CreateIssueCategories1751849010757'

    public async up(queryRunner: QueryRunner): Promise<void> {
                
        await queryRunner.query(`
            CREATE TABLE \`issue_categories\` (
                \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`created_by\` bigint NULL,
                \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`updated_by\` bigint NULL,
                \`is_active\` tinyint NOT NULL DEFAULT 1,
                \`deleted_at\` timestamp NULL,
                \`issue_category_id\` bigint NOT NULL AUTO_INCREMENT,
                \`name\` text NOT NULL,
                \`description\` text NOT NULL,
                PRIMARY KEY (\`issue_category_id\`)
            ) ENGINE=InnoDB;
        `);

        await queryRunner.query(`
            INSERT INTO \`issue_categories\` (\`name\`, \`description\`)
            VALUES 
            ('Incorrect', 'The information is wrong or misleading.'),
            ('Missing', 'Important content was not included.'),
            ('Irrelevant', 'The response includes off-topic or unnecessary content.'),
            ('Misclassified', 'The concept or entity was labeled incorrectly.'),
            ('Unclear', 'The meaning is confusing or ambiguous.'),
            ('Other', 'Something else is wrong (with optional comment).');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`issue_categories\``);
    }

}
