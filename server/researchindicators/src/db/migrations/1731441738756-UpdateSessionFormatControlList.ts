import { MigrationInterface, QueryRunner } from 'typeorm';
import { SessionFormatEnum } from '../../domain/entities/session-formats/enums/session-format.enum';

export class UpdateSessionFormatControlList1731441738756
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session_formats SET name = 'Group training' WHERE session_format_id = ${SessionFormatEnum.GROUP}`,
    );
    await queryRunner.query(
      `UPDATE session_formats SET name = 'Individual training' WHERE session_format_id = ${SessionFormatEnum.INDIVIDUAL}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session_formats SET name = 'Group' WHERE session_format_id = ${SessionFormatEnum.GROUP}`,
    );
    await queryRunner.query(
      `UPDATE session_formats SET name = 'Individual' WHERE session_format_id = ${SessionFormatEnum.INDIVIDUAL}`,
    );
  }
}
