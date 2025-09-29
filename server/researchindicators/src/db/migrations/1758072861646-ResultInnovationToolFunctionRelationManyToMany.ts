import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResultInnovationToolFunctionRelationManyToMany1758072861646
  implements MigrationInterface
{
  name = 'ResultInnovationToolFunctionRelationManyToMany1758072861646';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const fk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'result_innovation_dev'
                AND CONSTRAINT_NAME = 'FK_603ec7aff1ca62ab289f8fb7c27'
        `);

    if (fk.length > 0) {
      await queryRunner.query(`
            ALTER TABLE \`result_innovation_dev\`
            DROP FOREIGN KEY \`FK_603ec7aff1ca62ab289f8fb7c27\`
        `);
    }

    const table = await queryRunner.getTable('result_innovation_dev');

    if (table && table.findColumnByName('tool_function_id')) {
      await queryRunner.query(
        'ALTER TABLE `result_innovation_dev` DROP COLUMN `tool_function_id`',
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`result_innovation_tool_function\` ADD CONSTRAINT \`FK_fb153405a8f0b1c83c04ade637d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result_innovation_dev\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_tool_function\` ADD CONSTRAINT \`FK_1a9b365c7b4bc67cacb3b0b21c2\` FOREIGN KEY (\`tool_function_id\`) REFERENCES \`tool_functions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_tool_function\` DROP FOREIGN KEY \`FK_1a9b365c7b4bc67cacb3b0b21c2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_tool_function\` DROP FOREIGN KEY \`FK_fb153405a8f0b1c83c04ade637d\``,
    );

    const table = await queryRunner.getTable('result_innovation_dev');
    if (table && !table.findColumnByName('tool_function_id')) {
      await queryRunner.query(
        'ALTER TABLE `result_innovation_dev` ADD `tool_function_id` int NULL',
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_dev\` ADD CONSTRAINT \`FK_603ec7aff1ca62ab289f8fb7c27\` FOREIGN KEY (\`tool_function_id\`) REFERENCES \`tool_functions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
