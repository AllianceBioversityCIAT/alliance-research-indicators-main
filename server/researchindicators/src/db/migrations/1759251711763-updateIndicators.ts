import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class UpdateIndicators1759251711763 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`name\` = 'OICR' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`indicators\` SET \`name\` = 'OICRS' WHERE \`indicator_id\` = ${IndicatorsEnum.OICR}`,
    );
  }
}
