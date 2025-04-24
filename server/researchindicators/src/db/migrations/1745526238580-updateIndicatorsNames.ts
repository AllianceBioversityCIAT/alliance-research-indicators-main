import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class UpdateIndicatorsNames1745526238580 implements MigrationInterface {
  name = 'UpdateIndicatorsNames1745526238580';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD \`position\` bigint NULL`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`position\` = 0 WHERE \`indicator_id\` = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`position\` = 1 WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`position\` = 2 WHERE \`indicator_id\` = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`position\` = 3 WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_USE}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`position\` = 4 WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`position\` = 5 WHERE \`indicator_id\` = ${IndicatorsEnum.POLICY_CHANGE}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`name\` = 'OICRS' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP COLUMN \`position\``,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`name\` = 'OICR' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
  }
}
