import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStatusHistory1768333964044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.to_status_id = 10
            where r.indicator_id = 5
            and sh.to_status_id = 4;`,
    );
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.from_status_id = 10
            where r.indicator_id = 5
            and sh.from_status_id  = 4;`,
    );
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.to_status_id = 15
            where r.indicator_id = 5
            and sh.to_status_id = 7;`,
    );
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.from_status_id = 15
            where r.indicator_id = 5
            and sh.from_status_id  = 7;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.to_status_id = 4
            where r.indicator_id = 5
            and sh.to_status_id = 10;`,
    );
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.from_status_id = 4
            where r.indicator_id = 5
            and sh.from_status_id = 10;`,
    );
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.to_status_id = 7
            where r.indicator_id = 5
            and sh.to_status_id = 15;`,
    );
    await queryRunner.query(
      `update results r 
            inner join submission_history sh on sh.result_id = r.result_id 
            set sh.from_status_id = 7
            where r.indicator_id = 5
            and sh.from_status_id = 15;`,
    );
  }
}
