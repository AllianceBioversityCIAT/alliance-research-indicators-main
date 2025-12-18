import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

export class UpdateStatusNameRevised1764773160868
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE result_status
            SET name = 'Pending Revision'
            WHERE result_status_id = ${ResultStatusEnum.REVISED};
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE result_status
            SET name = 'Revised'
            WHERE result_status_id = ${ResultStatusEnum.REVISED};
        `);
  }
}
