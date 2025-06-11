import { MigrationInterface, QueryRunner } from 'typeorm';
import { IndicatorsEnum } from '../../domain/entities/indicators/enum/indicators.enum';

export class UpdateIndicatorIcons1749600312958 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pi-users' WHERE indicator_id = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pi-flag' WHERE indicator_id = ${IndicatorsEnum.INNOVATION_DEV};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pi-lightbulb' WHERE indicator_id = ${IndicatorsEnum.KNOWLEDGE_PRODUCT};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pi-folder-open' WHERE indicator_id = ${IndicatorsEnum.POLICY_CHANGE};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pi-chart-pie' WHERE indicator_id = ${IndicatorsEnum.OICR};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pi-sun' WHERE indicator_id = ${IndicatorsEnum.INNOVATION_USE};`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'group' WHERE indicator_id = ${IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'flag' WHERE indicator_id = ${IndicatorsEnum.INNOVATION_DEV};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'lightbulb' WHERE indicator_id = ${IndicatorsEnum.KNOWLEDGE_PRODUCT};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'folder_open' WHERE indicator_id = ${IndicatorsEnum.POLICY_CHANGE};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'pie_chart' WHERE indicator_id = ${IndicatorsEnum.OICR};`,
    );
    await queryRunner.query(
      `UPDATE indicators SET icon_src = 'wb_sunny' WHERE indicator_id = ${IndicatorsEnum.INNOVATION_USE};`,
    );
  }
}
