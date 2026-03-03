import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class AddedIsEditableDate1772553395986 implements MigrationInterface {
  name = 'AddedIsEditableDate1772553395986';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` ADD \`is_editable_date\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE \`result_status_workflow\` SET \`is_editable_date\` = 1 WHERE indicator_id = ${IndicatorsEnum.OICR}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status_workflow\` DROP COLUMN \`is_editable_date\``,
    );
  }
}
