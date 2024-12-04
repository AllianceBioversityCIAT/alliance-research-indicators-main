import { MigrationInterface, QueryRunner } from 'typeorm';
import { ClarisaGeoScopeEnum } from '../../domain/tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';

export class InsertGeoScope501733239265272 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`clarisa_geo_scope\` (code, name, definition) VALUES (${ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED}, 'This is yet to be determined','')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`clarisa_geo_scope\` WHERE code = ${ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED}`,
    );
  }
}
