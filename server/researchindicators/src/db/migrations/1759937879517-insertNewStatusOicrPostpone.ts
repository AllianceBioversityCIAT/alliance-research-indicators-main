import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

export class InsertNewStatusOicrPostpone1759937879517
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO result_status (result_status_id, name) VALUES (${ResultStatusEnum.POSTPONE}, 'Postpone')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM result_status WHERE result_status_id = ${ResultStatusEnum.POSTPONE}`,
    );
  }
}
