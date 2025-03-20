import { MigrationInterface, QueryRunner } from 'typeorm';
import { SessionLengthEnum } from '../../domain/entities/session-lengths/enum/session-lengths.enum';

export class UpdateSessionLengthsNames1736800169056
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Short-term (3 months and more)' WHERE session_length_id = ${SessionLengthEnum.SHORT_TERM}`,
    );
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Long-term (below 3 months)' WHERE session_length_id = ${SessionLengthEnum.LONG_TERM}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Short-term' WHERE session_length_id = ${SessionLengthEnum.SHORT_TERM}`,
    );
    await queryRunner.query(
      `UPDATE session_lengths SET name = 'Long-term' WHERE session_length_id = ${SessionLengthEnum.LONG_TERM}`,
    );
  }
}
