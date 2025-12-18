import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

export class UpdateStatusNameRejected1764804642820
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                UPDATE result_status
                SET name = 'Do not approve'
                WHERE result_status_id = ${ResultStatusEnum.REJECTED};
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                UPDATE result_status
                SET name = 'Rejected'
                WHERE result_status_id = ${ResultStatusEnum.REJECTED};
            `);
  }
}
