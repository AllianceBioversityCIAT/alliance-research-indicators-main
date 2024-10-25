import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorTypeEnum } from '../../domain/entities/indicator-types/enum/indicator-type.enum';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class AddedOtherNamesIndicators1729864456157
  implements MigrationInterface
{
  name = 'AddedOtherNamesIndicators1729864456157';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicator_types\` ADD \`other_names\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD \`other_names\` text NULL`,
    );
    await queryRunner.query(
      `UPDATE indicator_types SET other_names = 'Outcomes' WHERE indicator_type_id = ${IndicatorTypeEnum.OUTCOME}`,
    );
    await queryRunner.query(
      `UPDATE indicator_types SET other_names = 'Outputs' WHERE indicator_type_id = ${IndicatorTypeEnum.OUTPUT}`,
    );
    await queryRunner.query(
      `UPDATE indicators SET name = 'Innovation Development' WHERE indicator_id = ${IndicatorsEnum.INNOVATION_DEV}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP COLUMN \`other_names\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_types\` DROP COLUMN \`other_names\``,
    );
  }
}
