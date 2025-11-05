import { MigrationInterface, QueryRunner } from 'typeorm';
import { SessionLengthEnum } from '../../domain/entities/session-lengths/enum/session-lengths.enum';

export class SessionLengths1762350410461 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Short-term (below 3 months)' WHERE session_length_id = ${SessionLengthEnum.SHORT_TERM}`,
    );
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Long-term (3 months and more)' WHERE session_length_id = ${SessionLengthEnum.LONG_TERM}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Short term (3 months and more)' WHERE session_length_id = ${SessionLengthEnum.SHORT_TERM}`,
    );
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Long term (below 3 months)' WHERE session_length_id = ${SessionLengthEnum.LONG_TERM}`,
    );
  }
}
