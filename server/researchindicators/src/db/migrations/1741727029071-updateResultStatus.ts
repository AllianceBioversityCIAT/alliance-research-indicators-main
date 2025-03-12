import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

export class UpdateResultStatus1741727029071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO result_status (result_status_id, name) VALUES (${ResultStatusEnum.DRAFT}, 'Draft'), (${ResultStatusEnum.REVISED}, 'Revised'), (${ResultStatusEnum.APPROVED}, 'Approved'), (${ResultStatusEnum.REJECTED}, 'Rejected'), (${ResultStatusEnum.DELETED}, 'Deleted')`,
    );

    await queryRunner.query(
      `UPDATE result_status SET is_active = 0 WHERE result_status_id IN (${ResultStatusEnum.EDITING}, ${ResultStatusEnum.SUBMITTED})`,
    );

    await queryRunner.query(
      `UPDATE results r SET r.result_status_id = 4 WHERE r.result_status_id = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM result_status WHERE result_status_id IN (${ResultStatusEnum.DRAFT}, ${ResultStatusEnum.REVISED}, ${ResultStatusEnum.APPROVED}, ${ResultStatusEnum.REJECTED}, ${ResultStatusEnum.DELETED})`,
    );

    await queryRunner.query(
      `UPDATE result_status SET is_active = 1 WHERE result_status_id IN (${ResultStatusEnum.EDITING}, ${ResultStatusEnum.SUBMITTED})`,
    );

    await queryRunner.query(
      `UPDATE results r SET r.result_status_id = 1 WHERE r.result_status_id = 4`,
    );
  }
}
