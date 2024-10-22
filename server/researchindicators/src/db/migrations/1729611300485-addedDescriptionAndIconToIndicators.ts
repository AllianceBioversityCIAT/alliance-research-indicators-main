import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorTypeEnum } from '../../domain/entities/indicator-types/enum/indicator-type.enum';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class AddedDescriptionAndIconToIndicators1729611300485
  implements MigrationInterface
{
  name = 'AddedDescriptionAndIconToIndicators1729611300485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicator_types\` ADD \`description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD \`icon_src\` text NULL`,
    );
    await queryRunner.query(
      `UPDATE \`indicator_types\` SET \`description\` = 'Knowledge, technical or institutional advancement produced by Alliance research, engagement and/or capacity development activities.' WHERE \`indicator_type_id\` = ${IndicatorTypeEnum.OUTPUT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicator_types\` SET \`description\` = 'A change in knowledge, skills, attitudes and/or relationships, which manifests as a change in behavior in particular actors, to which research outputs and related activities have contributed.' WHERE \`indicator_type_id\` = ${IndicatorTypeEnum.OUTCOME}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`indicator_type_id\` = ${IndicatorTypeEnum.OUTPUT}, \`icon_src\` = 'lightbulb'  WHERE \`indicator_id\` = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`indicator_type_id\` = ${IndicatorTypeEnum.OUTPUT}, \`icon_src\` = 'group'  WHERE \`indicator_id\` = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`indicator_type_id\` = ${IndicatorTypeEnum.OUTPUT}, \`icon_src\` = 'flag'  WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`indicator_type_id\` = ${IndicatorTypeEnum.OUTCOME}, \`icon_src\` = 'wb_sunny'  WHERE \`indicator_id\` = ${IndicatorsEnum.INNOVATION_USE}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`indicator_type_id\` = ${IndicatorTypeEnum.OUTCOME}, \`icon_src\` = 'pie_chart'  WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`indicator_type_id\` = ${IndicatorTypeEnum.OUTCOME}, \`icon_src\` = 'folder_open'  WHERE \`indicator_id\` = ${IndicatorsEnum.POLICY_CHANGE}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP COLUMN \`icon_src\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_types\` DROP COLUMN \`description\``,
    );
  }
}
