import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultStatusId1768332927495 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'update results set result_status_id = 10 where result_status_id = 4 and indicator_id = 5;',
    );
    await queryRunner.query(
      'update results set result_status_id = 15 where result_status_id = 7 and indicator_id = 5;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'update results set result_status_id = 4 where result_status_id = 10 and indicator_id = 5;',
    );
    await queryRunner.query(
      'update results set result_status_id = 7 where result_status_id = 15 and indicator_id = 5;',
    );
  }
}
