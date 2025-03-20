import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorTypeEnum } from '../../domain/entities/indicator-types/enum/indicator-type.enum';

export class InsertIndicators1727208057174 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO indicator_types (indicator_type_id, name) VALUES (${IndicatorTypeEnum.OUTPUT}, 'Output'), (${IndicatorTypeEnum.OUTCOME}, 'Outcome')`,
    );
    await queryRunner.query(
      `INSERT INTO indicators (indicator_id, name, indicator_type_id) VALUES (1, 'Capacity Sharing for Development', 2), (2, 'Innovation', 2), (3, 'Knowledge Product', 2), (4, 'Policy Change', 2), (5, 'OICR', 2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM indicators WHERE indicator_id IN (1, 2, 3, 4, 5)`,
    );
    await queryRunner.query(
      `DELETE FROM indicator_types WHERE indicator_type_id IN (${IndicatorTypeEnum.OUTPUT}, ${IndicatorTypeEnum.OUTCOME})`,
    );
  }
}
